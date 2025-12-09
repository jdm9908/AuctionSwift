from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Monkey-patch httpx to disable HTTP/2 before any other imports
# This fixes WinError 10035 on Windows with HTTP/2 connections
import httpx
_original_client_init = httpx.Client.__init__
def _patched_client_init(self, *args, **kwargs):
    kwargs['http2'] = False  # Force HTTP/1.1
    return _original_client_init(self, *args, **kwargs)
httpx.Client.__init__ = _patched_client_init

from supabase import create_client, Client
from openai import OpenAI
from pydantic import BaseModel
import os
import base64
from typing import Optional, List
from agents import Agent, Runner, WebSearchTool
import asyncio
import time

# load env from root dir
root_dir = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(root_dir, '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_DESCRIPTION_KEY = os.getenv("OPENAI_DESCRIPTION_KEY")
OPENAI_COMPS_KEY = os.getenv("OPENAI_COMPS_KEY")

# setup supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# setup openai client for descriptions
openai_description_client = OpenAI(api_key=OPENAI_DESCRIPTION_KEY) if OPENAI_DESCRIPTION_KEY else None

app = FastAPI()

# Get allowed origins from environment or use defaults
# In production, set ALLOWED_ORIGINS env variable to your frontend domain
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_str:
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
else:
    # Default development origins
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

# enable cors for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "all good"}

# ============================================
# SIMPLE DESCRIPTION ENDPOINT (FAST, SAFE)
# ============================================
class SimpleDescriptionRequest(BaseModel):
    title: str
    brand: str | None = None
    year: str | None = None
    notes: str | None = None

@app.post("/simple-generate-description")
async def simple_generate_description(req: SimpleDescriptionRequest):
    """
    Lightweight: generates a 2–4 sentence item description.
    No agents. No web search. Fast & cheap.
    """

    if not openai_description_client:
        raise HTTPException(500, "OpenAI description API key not configured.")

    prompt = f"""
    Write a concise 2–4 sentence auction listing description for:

    Title: {req.title}
    Brand: {req.brand}
    Year: {req.year}
    Notes: {req.notes}

    Tone: confident and descriptive.
    """

    response = openai_description_client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    # Extract plain text safely
    text = response.output_text.strip()

    return {"description": text}


from fastapi.responses import FileResponse
import tempfile
from openpyxl import Workbook

@app.get("/auctions/{auction_id}/excel")
def export_excel(auction_id: str):
    # Fetch auction
    auction = supabase.table("auctions").select("*").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")
    auction = auction.data[0]

    # Fetch items
    items = supabase.table("items").select("*").eq("auction_id", auction_id).execute().data

    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Items"

    # Header
    ws.append(["Title", "Brand", "Model", "Year", "Image 1 URL"])

    # Rows
    for item in items:
        ws.append([
            item.get("title", ""),
            item.get("brand", ""),
            item.get("model", ""),
            item.get("year", ""),
            item.get("image_url_1", ""),
        ])

    # Save to temp file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    wb.save(temp_file.name)

    return FileResponse(
        temp_file.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"{auction['auction_name']}.xlsx"
    )

# PROFILE ENDPOINTS

# create a new user/profile
@app.post("/users")
def create_user(email: str, role: str = "staff"):
    # check inputs
    if not email.strip():
        raise HTTPException(400, "Email cannot be empty")
    
    if role not in ["admin", "staff"]:
        raise HTTPException(400, "Role must be 'admin' or 'staff'")

    # email must be unique
    existing = supabase.table("profiles").select("profile_id").eq("email", email).execute()
    if existing.data:
        raise HTTPException(400, "Email already exists")

    # save to db
    result = supabase.table("profiles").insert({
        "email": email.strip(),
        "role": role
    }).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create user")

    return result.data[0]

# get one user by id
@app.get("/users/{profile_id}")
def get_user(profile_id: str):
    # lookup user
    user = supabase.table("profiles").select("*").eq("profile_id", profile_id).execute()
    if not user.data:
        raise HTTPException(404, "User not found")
    return user.data[0]

# update user email
@app.put("/users/{profile_id}/email")
def update_user_email(profile_id: str, email: str):
    # verify user exists
    user = supabase.table("profiles").select("profile_id").eq("profile_id", profile_id).execute()
    if not user.data:
        raise HTTPException(404, "User not found")

    # email must be available
    taken = supabase.table("profiles").select("profile_id").eq("email", email).execute()
    if taken.data and taken.data[0]["profile_id"] != profile_id:
        raise HTTPException(400, "Email already exists")

    # save new email
    res = supabase.table("profiles").update({"email": email.strip()}).eq("profile_id", profile_id).execute()
    if not res.data:
        raise HTTPException(500, "Failed to update email")
    return res.data[0]

# activate user account
@app.post("/payments")
def make_payment(profile_id: str):
    # lookup user
    user = supabase.table("profiles").select("*").eq("profile_id", profile_id).execute()
    if not user.data:
        raise HTTPException(404, "User not found")

    # mark as active
    result = supabase.table("profiles").update({"is_active": True}).eq("profile_id", profile_id).execute()
    if not result.data:
        raise HTTPException(500, "Failed to update payment status")

    return {"message": "Payment successful", "profile_id": profile_id, "is_active": True}

# auction endpoints

# make new auction
@app.post("/auctions")
def create_auction(profile_id: str, auction_name: str, is_demo: bool = False):
    # check inputs
    if not auction_name.strip():
        raise HTTPException(400, "Auction name cannot be empty")

    # Check if profile exists - if not, auto-create it for new Supabase Auth users
    prof = supabase.table("profiles").select("profile_id, is_active").eq("profile_id", profile_id).execute()
    if not prof.data:
        # Auto-create profile for new users (from Supabase Auth)
        new_profile = supabase.table("profiles").insert({
            "profile_id": profile_id,
            "email": "",  # Will be updated later if needed
            "is_active": True
        }).execute()
        if not new_profile.data:
            raise HTTPException(500, "Failed to create user profile")
    elif not prof.data[0]["is_active"]:
        raise HTTPException(403, "User is not active")

    # create auction
    result = supabase.table("auctions").insert({
        "profile_id": profile_id,
        "auction_name": auction_name.strip(),
        "is_demo": is_demo
    }).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create auction")

    return result.data[0]

# GET auction by id
@app.get("/auctions/{auction_id}")
def get_auction(auction_id: str):
    # find auction
    auction = supabase.table("auctions").select("*").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")
    return auction.data[0]

# GET all auctions for a user
@app.get("/auctions")
def list_auctions_by_user(profile_id: str):
    # Get all auctions for this user (don't require profile to exist in profiles table)
    # New users from Supabase Auth may not have a profiles entry yet
    auctions = supabase.table("auctions").select("*").eq("profile_id", profile_id).order("created_at", desc=True).execute()
    if not auctions.data:
        return {"message": "No auctions found for this user", "auctions": []}

    return {"profile_id": profile_id, "auctions": auctions.data}

# UPDATE auction name
@app.put("/auctions/{auction_id}")
def update_auction(auction_id: str, auction_name: str):
    # check auction exists
    auction = supabase.table("auctions").select("auction_id").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")

    # update name
    res = supabase.table("auctions").update({"auction_name": auction_name.strip()}).eq("auction_id", auction_id).execute()
    if not res.data:
        raise HTTPException(500, "Failed to update auction")
    return res.data[0]

# DELETE auction (with cascade deletion of related data)
@app.delete("/auctions/{auction_id}")
def delete_auction(auction_id: str):
    # Check auction exists
    auction = supabase.table("auctions").select("auction_id").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")

    # Get all items in this auction
    items_response = supabase.table("items").select("item_id").eq("auction_id", auction_id).execute()
    item_ids = [item["item_id"] for item in items_response.data] if items_response.data else []

    if item_ids:
        # delete all comps for these items
        try:
            for item_id in item_ids:
                supabase.table("comps").delete().eq("item_id", item_id).execute()
        except Exception:
            pass

        # delete all item_images for these items
        try:
            for item_id in item_ids:
                supabase.table("item_images").delete().eq("item_id", item_id).execute()
        except Exception:
            pass

        # delete all items in this auction
        try:
            supabase.table("items").delete().eq("auction_id", auction_id).execute()
        except Exception as e:
            raise HTTPException(500, f"Failed to delete items: {str(e)}")

    # Step 4: Finally delete the auction itself
    try:
        supabase.table("auctions").delete().eq("auction_id", auction_id).execute()
    except Exception as e:
        raise HTTPException(500, f"Failed to delete auction: {str(e)}")

    return {
        "message": "Auction and all related data deleted successfully",
        "auction_id": auction_id,
        "deleted_items": len(item_ids)
    }

# ============================================
# ITEM ENDPOINTS
# ============================================

# create item + 1..5 image urls (now uses auction_id)
@app.post("/items")
def create_item(
    auction_id: str,
    title: str,
    image_url_1: str,
    image_url_2: str = "",
    image_url_3: str = "",
    image_url_4: str = "",
    image_url_5: str = "",
    brand: str = "",
    model: str = "",
    year: int | None = None,
    ai_description: str = ""
):
    # check auction exists
    auction = supabase.table("auctions").select("auction_id, profile_id").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")
    
    # verify profile is active
    profile_id = auction.data[0]["profile_id"]
    prof = supabase.table("profiles").select("is_active").eq("profile_id", profile_id).execute()
    if not prof.data or not prof.data[0]["is_active"]:
        raise HTTPException(403, "User is not active")

    # gather images and basic check 1..5
    images = [u.strip() for u in [image_url_1, image_url_2, image_url_3, image_url_4, image_url_5] if u and u.strip()]
    if len(images) == 0:
        raise HTTPException(400, "At least one image URL is required")
    if len(images) > 5:
        raise HTTPException(400, "You can provide up to 5 image URLs")

    # defaults for brand/model/year
    brand_val = brand.strip() if brand.strip() else "Unknown"
    model_val = model.strip() if model.strip() else "Unknown"
    year_val = year if year is not None else None

    # insert item (is_listed defaults to false - must be approved in settings)
    item_res = supabase.table("items").insert({
        "auction_id": auction_id,
        "title": title.strip(),
        "brand": brand_val,
        "model": model_val,
        "year": year_val,
        "ai_description": ai_description.strip() if ai_description else None,
        "is_listed": False
    }).execute()
    if not item_res.data:
        raise HTTPException(500, "Failed to create item")

    item = item_res.data[0]
    item_id = item["item_id"]

    # insert item images with positions
    rows = [{"item_id": item_id, "url": url, "position": i + 1} for i, url in enumerate(images)]
    imgs_res = supabase.table("item_images").insert(rows).execute()
    if not imgs_res.data:
        # delete item if images failed so we don't leave orphans
        supabase.table("items").delete().eq("item_id", item_id).execute()
        raise HTTPException(500, "Failed to add item images")

    # return both
    return {"item": item, "images": imgs_res.data}

# GET all items for an auction
@app.get("/items")
def list_items(auction_id: str = None, profile_id: str = None):
    """
    Get items by auction_id OR get all items across all auctions for a profile_id
    """
    if auction_id:
        # get items for specific auction
        auction = supabase.table("auctions").select("auction_id").eq("auction_id", auction_id).execute()
        if not auction.data:
            raise HTTPException(404, "Auction not found")

        items = supabase.table("items").select("*").eq("auction_id", auction_id).order("created_at", desc=True).execute()
        if not items.data:
            return {"message": "No items found for this auction", "items": []}

        # get images
        item_ids = [i["item_id"] for i in items.data]
        imgs = supabase.table("item_images").select("*").in_("item_id", item_ids).execute()
        images = imgs.data if imgs.data else []

        # get comps for all items
        comps = supabase.table("comps").select("*").in_("item_id", item_ids).execute()
        comps_data = comps.data if comps.data else []

        # group images by item_id
        grouped_images = {}
        for img in images:
            iid = img["item_id"]
            if iid not in grouped_images:
                grouped_images[iid] = []
            grouped_images[iid].append(img)

        # group comps by item_id and calculate suggested starting price
        grouped_comps = {}
        for comp in comps_data:
            iid = comp["item_id"]
            if iid not in grouped_comps:
                grouped_comps[iid] = []
            grouped_comps[iid].append(comp)

        # attach images, comps, and suggested_starting_price to items
        for it in items.data:
            it["images"] = grouped_images.get(it["item_id"], [])
            item_comps = grouped_comps.get(it["item_id"], [])
            it["comps"] = item_comps
            
            # Calculate suggested starting price: average of comps * 0.8, rounded down to nearest 5
            if item_comps:
                avg_price = sum(c.get("sold_price", 0) for c in item_comps) / len(item_comps)
                raw_suggested = avg_price * 0.8
                it["suggested_starting_price"] = int(raw_suggested // 5) * 5  # Round down to nearest 5
            else:
                it["suggested_starting_price"] = None

        return {"auction_id": auction_id, "items": items.data}

    elif profile_id:
        # get all items across all auctions for this profile
        try:
            # Don't require profile to exist in profiles table - just check auctions directly
            # New users from Supabase Auth may not have a profiles entry yet
            auctions = supabase.table("auctions").select("auction_id").eq("profile_id", profile_id).execute()
            if not auctions.data:
                return {"message": "No auctions found for this user", "items": []}

            auction_ids = [a["auction_id"] for a in auctions.data]

            # get all items in these auctions
            items = supabase.table("items").select("*").in_("auction_id", auction_ids).order("created_at", desc=True).execute()
            if not items.data:
                return {"message": "No items found for this user", "items": []}

            # get images
            item_ids = [i["item_id"] for i in items.data]
            imgs = supabase.table("item_images").select("*").in_("item_id", item_ids).execute()
            images = imgs.data if imgs.data else []

            # get comps for all items
            comps = supabase.table("comps").select("*").in_("item_id", item_ids).execute()
            comps_data = comps.data if comps.data else []

            # group images by item_id
            grouped_images = {}
            for img in images:
                iid = img["item_id"]
                if iid not in grouped_images:
                    grouped_images[iid] = []
                grouped_images[iid].append(img)

            # group comps by item_id
            grouped_comps = {}
            for comp in comps_data:
                iid = comp["item_id"]
                if iid not in grouped_comps:
                    grouped_comps[iid] = []
                grouped_comps[iid].append(comp)

            # attach images, comps, and suggested_starting_price to items
            for it in items.data:
                it["images"] = grouped_images.get(it["item_id"], [])
                item_comps = grouped_comps.get(it["item_id"], [])
                it["comps"] = item_comps
                
                # Calculate suggested starting price: average of comps * 0.8
                if item_comps:
                    # Calculate suggested starting price: average of comps * 0.8, rounded down to nearest 5
                    avg_price = sum(c.get("sold_price", 0) for c in item_comps) / len(item_comps)
                    raw_suggested = avg_price * 0.8
                    it["suggested_starting_price"] = int(raw_suggested // 5) * 5  # Round down to nearest 5
                else:
                    it["suggested_starting_price"] = None

            return {"profile_id": profile_id, "items": items.data}
        
        except httpx.ReadError as e:
            raise HTTPException(503, "Database connection timeout. Please try again.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Failed to fetch items: {str(e)}")
    
    else:
        raise HTTPException(400, "Must provide either auction_id or profile_id")

# GET single item by id
@app.get("/items/{item_id}")
def get_item(item_id: str):
    # find item
    item = supabase.table("items").select("*").eq("item_id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")

    # get images
    imgs = supabase.table("item_images").select("*").eq("item_id", item_id).execute()
    item_data = item.data[0]
    item_data["images"] = imgs.data if imgs.data else []

    return item_data

# UPDATE item
@app.put("/items/{item_id}")
def update_item(
    item_id: str,
    title: str = None,
    brand: str = None,
    model: str = None,
    year: int = None
):
    # check item exists
    item = supabase.table("items").select("item_id").eq("item_id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")

    # build update dict
    updates = {}
    if title is not None:
        updates["title"] = title.strip()
    if brand is not None:
        updates["brand"] = brand.strip()
    if model is not None:
        updates["model"] = model.strip()
    if year is not None:
        updates["year"] = year

    if not updates:
        raise HTTPException(400, "No fields to update")

    # update
    res = supabase.table("items").update(updates).eq("item_id", item_id).execute()
    if not res.data:
        raise HTTPException(500, "Failed to update item")
    return res.data[0]

# delete item and related data
@app.delete("/items/{item_id}")
def delete_item(item_id: str):
    try:
        # try rpc function first
        result = supabase.rpc('delete_item_cascade', {'p_item_id': item_id}).execute()
        
        if result.data is None or (isinstance(result.data, list) and len(result.data) == 0):
            raise HTTPException(404, "Item not found")
        
        return {"message": "Item deleted successfully", "item_id": item_id}
    
    except HTTPException:
        raise
    except Exception as e:
        # fallback to manual deletion
        try:
            supabase.table("comps").delete().eq("item_id", item_id).execute()
            supabase.table("item_images").delete().eq("item_id", item_id).execute()
            item_result = supabase.table("items").delete().eq("item_id", item_id).execute()
            
            if not item_result.data:
                raise HTTPException(404, "Item not found")
            
            return {"message": "Item deleted successfully", "item_id": item_id}
        except Exception as fallback_error:
            raise HTTPException(500, f"Failed to delete item: {str(fallback_error)}")

# UPDATE item image URL
@app.put("/items/{item_id}/images/{image_id}")
def update_item_image(item_id: str, image_id: int, url: str):
    """
    Update the URL of a specific image for an item.
    Used after uploading image to Supabase Storage.
    """
    # Verify item exists
    item = supabase.table("items").select("item_id").eq("item_id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")
    
    # Update the image URL
    res = supabase.table("item_images").update({"url": url}).eq("image_id", image_id).execute()
    if not res.data:
        raise HTTPException(500, "Failed to update image URL")
    
    return {"message": "Image URL updated successfully", "image": res.data[0]}


# ADD additional images to an item
class AddItemImagesRequest(BaseModel):
    urls: List[str]

@app.post("/items/{item_id}/images")
def add_item_images(item_id: str, request: AddItemImagesRequest):
    """
    Add additional images to an existing item.
    Used after uploading images to Supabase Storage.
    """
    # Verify item exists
    item = supabase.table("items").select("item_id").eq("item_id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")
    
    # Get current highest position for this item
    existing = supabase.table("item_images").select("position").eq("item_id", item_id).order("position", desc=True).limit(1).execute()
    next_position = (existing.data[0]["position"] + 1) if existing.data else 1
    
    # Insert new images with sequential positions
    rows = []
    for i, url in enumerate(request.urls):
        rows.append({
            "item_id": item_id,
            "url": url,
            "position": next_position + i
        })
    
    if rows:
        res = supabase.table("item_images").insert(rows).execute()
        if not res.data:
            raise HTTPException(500, "Failed to add images")
        return {"message": f"Added {len(rows)} images", "images": res.data}
    
    return {"message": "No images to add", "images": []}


# SET an image as primary (position 1)
@app.put("/items/{item_id}/images/{image_id}/primary")
def set_image_primary(item_id: str, image_id: int):
    """
    Set an image as the primary image for an item.
    Moves the selected image to position 1 and shifts others accordingly.
    """
    # Verify item exists
    item = supabase.table("items").select("item_id").eq("item_id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")
    
    # Get all images for this item
    images = supabase.table("item_images").select("*").eq("item_id", item_id).order("position").execute()
    if not images.data:
        raise HTTPException(404, "No images found for this item")
    
    # Find the target image
    target_image = None
    for img in images.data:
        if img["image_id"] == image_id:
            target_image = img
            break
    
    if not target_image:
        raise HTTPException(404, "Image not found")
    
    # If already primary, nothing to do
    if target_image["position"] == 1:
        return {"message": "Image is already primary", "image": target_image}
    
    # Reorder: set target to position 1, shift others down
    # First, set target to position 0 (temporary)
    supabase.table("item_images").update({"position": 0}).eq("image_id", image_id).execute()
    
    # Increment positions of all images that were before the target
    for img in images.data:
        if img["image_id"] != image_id and img["position"] < target_image["position"]:
            supabase.table("item_images").update({"position": img["position"] + 1}).eq("image_id", img["image_id"]).execute()
    
    # Set target to position 1
    res = supabase.table("item_images").update({"position": 1}).eq("image_id", image_id).execute()
    
    return {"message": "Image set as primary", "image": res.data[0] if res.data else target_image}


# comps endpoints

# get saved comps for item
@app.get("/items/{item_id}/comps/saved")
def get_saved_comps(item_id: str):
    """
    Retrieve previously saved comps from the database for an item.
    This is useful when the scraper is rate-limited or unavailable.
    """
    try:
        # Verify item exists
        item = supabase.table("items").select("item_id").eq("item_id", item_id).execute()
        if not item.data:
            raise HTTPException(404, "Item not found")
        
        # Get saved comps from database
        comps = supabase.table("comps").select("*").eq("item_id", item_id).order("created_at", desc=True).execute()
        
        if not comps.data:
            return {
                "item_id": item_id,
                "comps_count": 0,
                "comps": []
            }
        
        # Format comps for frontend
        formatted_comps = []
        for comp in comps.data:
            formatted_comps.append({
                "comp_id": comp.get("comp_id"),
                "source": comp.get("source", "eBay"),
                "link": comp.get("source_url"),  # Use source_url for the eBay listing URL
                "sale_price": comp.get("sold_price"),
                "currency": comp.get("currency", "USD"),
                "date_text": comp.get("sold_at"),
                "title": comp.get("notes")
            })
        
        return {
            "item_id": item_id,
            "comps_count": len(formatted_comps),
            "comps": formatted_comps
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to retrieve saved comps: {str(e)}")

# ============================================
# VISION / AI DESCRIPTION ENDPOINT
# ============================================

@app.post("/items/generate-description")
async def generate_item_description(
    image: UploadFile = File(...),
    title: str = Form(...),
    model: str = Form(None),
    year: str = Form(None),
    notes: str = Form(None)
):
    """
    Generate a concise 3-sentence description for an auction item
    using OpenAI's vision API to analyze the uploaded image and condition notes.
    """
    try:
        # Read and encode the image
        image_data = await image.read()
        
        # Detect image format from content type or filename
        content_type = image.content_type or ""
        filename = image.filename or ""
        
        # Determine image format
        if "avif" in content_type.lower() or filename.lower().endswith(".avif"):
            # AVIF not supported by OpenAI, need to convert or use URL
            raise HTTPException(400, "AVIF format not supported. Please use PNG, JPEG, GIF, or WEBP format.")
        elif "png" in content_type.lower() or filename.lower().endswith(".png"):
            mime_type = "image/png"
        elif "gif" in content_type.lower() or filename.lower().endswith(".gif"):
            mime_type = "image/gif"
        elif "webp" in content_type.lower() or filename.lower().endswith(".webp"):
            mime_type = "image/webp"
        else:
            # Default to jpeg
            mime_type = "image/jpeg"
        
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Construct the item details string
        item_details = f"Title: {title}"
        if model:
            item_details += f"\nModel: {model}"
        if year:
            item_details += f"\nYear: {year}"
        if notes:
            item_details += f"\nCondition Notes: {notes}"
        
        # Create the prompt for vision API
        prompt = f"""You are an expert auction copywriter creating compelling product descriptions for online sales. Analyze this image and write a confident, definitive 3-sentence marketing description.

Item Details:
{item_details}

Requirements:
- Write exactly 3 sentences in a confident, definitive tone
- Sentence 1: State what the item is (brand, model, year if provided) - be direct and factual
- Sentence 2: Describe the visual appearance - color, finish, aesthetic details you observe in the image - use confident language (avoid "appears", "seems", "looks like")
- Sentence 3: If condition notes are provided, incorporate them naturally; otherwise describe the overall presentation and appeal
- Use persuasive sales language but remain honest and factual
- Be specific about what you see in the image
- No hedging words like "appears to be", "seems to", "possibly" - be direct and confident

Generate the 3-sentence description now:"""

        # Validate API key
        if not openai_description_client:
            raise HTTPException(500, "OpenAI Description API key not configured")
        
        # Call OpenAI vision API
        response = openai_description_client.chat.completions.create(
            model="gpt-4o",  # GPT-4 with vision
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        # Extract the generated description
        description = response.choices[0].message.content.strip()
        
        return {
            "success": True,
            "description": description,
            "item_details": {
                "title": title,
                "model": model,
                "year": year
            }
        }
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        raise HTTPException(500, f"Failed to generate description: {str(e)}")


# ============================================
# COMPS AGENT INTEGRATION
# ============================================

# Pydantic models for the comps agent
class CompSchema(BaseModel):
    source: str
    url: str
    sale_date: str
    price: str
    notes: str

class CompsRequest(BaseModel):
    item_id: str
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None
    notes: Optional[str] = None

class CompsResponse(BaseModel):
    comp_1: dict
    comp_2: dict
    comp_3: dict

@app.post("/comps")
async def generate_comps_simple(request: CompsRequest):
    """
    Generate comparable sales data using OpenAI Agents SDK.
    Requires: brand, model, year, notes
    Returns: 3 comps from different sources
    """
    try:
        # verify item exists
        item = supabase.table("items").select("*").eq("item_id", request.item_id).execute()
        if not item.data:
            raise HTTPException(404, "Item not found")
        
        item_data = item.data[0]
        
        # use provided values or fall back to item data
        brand = request.brand or item_data.get("brand") or "Unknown"
        model = request.model or item_data.get("model") or "Unknown"
        year = request.year or (str(item_data.get("year")) if item_data.get("year") else "Unknown")
        notes = request.notes or ""
        
        # validate comps api key
        if not OPENAI_COMPS_KEY:
            raise HTTPException(500, "OpenAI Comps API key not configured")
        
        # set openai api key for agents
        os.environ["OPENAI_API_KEY"] = OPENAI_COMPS_KEY
        
        # Define the comps schema with proper field names
        class Comp1Schema(BaseModel):
            source_1: str
            url_1: str
            sale_date_1: str
            price_1: str
            notes_1: str
        
        class Comp2Schema(BaseModel):
            source_2: str
            url_2: str
            sale_date_2: str
            price_2: str
            notes_2: str
        
        class Comp3Schema(BaseModel):
            source_3: str
            url_3: str
            sale_date_3: str
            price_3: str
            notes_3: str
        
        class CompsOutput(BaseModel):
            comp_1: Comp1Schema
            comp_2: Comp2Schema
            comp_3: Comp3Schema
        
        # Create agent with WebSearchTool
        comps_agent = Agent(
            name="Comps Agent",
            instructions=f"""You are a Comps Agent. Your job is to find SOLD comparables ("comps") for any item.

Here are the inputs:
- Brand: {brand}
- Model: {model}
- Year: {year}
- Notes: {notes}

**CURRENT DATE: December 1, 2025**

Use the web search tool to find REAL, RECENT sold listings with VALID, WORKING URLs from 2025 ONLY.

### CRITICAL REQUIREMENTS
1. **2025 SALES ONLY**: Every comp MUST be from 2025. Sales from 2024 or earlier are NOT acceptable.
2. **URLs MUST BE VALID**: Every URL must be a real, working link to an actual sold listing page. Do not fabricate or guess URLs.
3. **THREE DIFFERENT SOURCES**: Each comp must be from a different website (e.g., eBay, 1stDibs, Sotheby's, Grailed, StockX, Heritage Auctions, Poshmark, The RealReal, etc.).
4. **SOLD LISTINGS ONLY**: Must be completed sales, not active listings or "Buy It Now" prices.

### SEARCH STRATEGY
- Search for: "{brand} {model} {year} sold 2025"
- Try multiple search queries if needed: "sold items", "auction results 2025", "recently sold"
- Check MULTIPLE pages of results to find 2025 sales
- Verify the sale date is from 2025 before including
- Keep searching until you find 3 valid comps from 2025

### OUTPUT FORMAT (STRICT)
You must output exactly THREE comps from 2025, filling every field:

- `source_X`: The website name (e.g., "eBay", "Heritage Auctions", "1stDibs")
- `url_X`: The COMPLETE, VALID URL to the sold listing page
- `sale_date_X`: Format "YYYY-MM-DD" - MUST be EXACT date with valid day (e.g., "2025-08-27", "2025-10-20"). NO wildcards like "2025-09-**". If exact day unknown, use "01" for the day (e.g., "2025-09-01").
- `price_X`: String with numbers only, e.g., "425.00" (no currency symbols)
- `notes_X`: Include item condition, differences from target item, and any relevant details

### VALIDATION RULES
1. All three comps must be from three different websites, the comps should not be from the same source
2. All three comps must have sale dates in **2025 ONLY** (January 1 - November 16, 2025)
3. URLs must be **complete and valid** (start with https://)
4. If the first search doesn't return 2025 results, try different search terms and keep searching
5. Do NOT fabricate URLs or dates - only use real data from web search
6. If after extensive searching you cannot find 3 comps from 2025, only then set "source_X": "none"

**IMPORTANT**: Do not give up easily. Try multiple searches with different keywords until you find 3 valid 2025 sales.""",
            tools=[
                WebSearchTool(
                    search_context_size="medium",
                    user_location={
                        "type": "approximate",
                        "city": None,
                        "country": "US",
                        "region": None,
                        "timezone": None
                    }
                )
            ],
            output_type=CompsOutput,
        )
        
        # run agent with retry logic
        max_attempts = 3
        valid_comps = None
        
        for attempt in range(max_attempts):
            search_input = f"Find sold comparable items for {brand} {model} {year} from 2025"
            if attempt > 0:
                search_input += f" (Attempt {attempt + 1}: Focus on recent 2025 sales only)"
            
            result = await Runner.run(comps_agent, input=search_input)
            
            # transform to expected format
            raw_output = result.final_output.model_dump()
            comps_data = {
                "comp_1": {
                    "source": raw_output["comp_1"]["source_1"],
                    "url": raw_output["comp_1"]["url_1"],
                    "sale_date": raw_output["comp_1"]["sale_date_1"],
                    "price": raw_output["comp_1"]["price_1"],
                    "notes": raw_output["comp_1"]["notes_1"]
                },
                "comp_2": {
                    "source": raw_output["comp_2"]["source_2"],
                    "url": raw_output["comp_2"]["url_2"],
                    "sale_date": raw_output["comp_2"]["sale_date_2"],
                    "price": raw_output["comp_2"]["price_2"],
                    "notes": raw_output["comp_2"]["notes_2"]
                },
                "comp_3": {
                    "source": raw_output["comp_3"]["source_3"],
                    "url": raw_output["comp_3"]["url_3"],
                    "sale_date": raw_output["comp_3"]["sale_date_3"],
                    "price": raw_output["comp_3"]["price_3"],
                    "notes": raw_output["comp_3"]["notes_3"]
                }
            }
            
            # validate that all comps are from 2025
            valid_2025_comps = 0
            for comp_key in ["comp_1", "comp_2", "comp_3"]:
                comp_data = comps_data[comp_key]
                sale_date = comp_data.get("sale_date", "")
                
                if sale_date and sale_date.startswith("2025") and comp_data.get("source", "").lower() != "none":
                    valid_2025_comps += 1
            
            # if we have 3 valid 2025 comps, we're done
            if valid_2025_comps == 3:
                valid_comps = comps_data
                break
        
        # use last attempt if no valid comps found
        if valid_comps is None:
            valid_comps = comps_data
        
        # Save comps to database
        for comp_key in ["comp_1", "comp_2", "comp_3"]:
            if comp_key in valid_comps:
                comp_data = valid_comps[comp_key]
                if comp_data.get("source", "").lower() != "none":
                    try:
                        # Parse price (remove any currency symbols)
                        price_str = str(comp_data.get("price", "0")).replace("$", "").replace(",", "").strip()
                        price_numeric = float(price_str) if price_str else 0.0
                        
                        # parse date (handle various formats and validate)
                        sale_date = None
                        raw_date = comp_data.get("sale_date", "")
                        if raw_date and raw_date.lower() not in ["null", "unknown", "none"]:
                            import re
                            if re.match(r'^\d{4}-\d{2}-\d{2}$', raw_date):
                                sale_date = raw_date
                            else:
                                year_month_match = re.match(r'^(\d{4}-\d{2})', raw_date)
                                if year_month_match:
                                    sale_date = year_month_match.group(1) + "-01"
                        
                        # insert into comps table with retry logic
                        max_db_retries = 3
                        for retry in range(max_db_retries):
                            try:
                                supabase.table("comps").insert({
                                    "item_id": request.item_id,
                                    "source": comp_data.get("source", "Unknown"),
                                    "url_comp": comp_data.get("url", ""),
                                    "sold_price": price_numeric,
                                    "currency": "USD",
                                    "sold_at": sale_date,
                                    "notes": comp_data.get("notes", "")
                                }).execute()
                                break
                            except httpx.ReadError as db_error:
                                if retry < max_db_retries - 1:
                                    await asyncio.sleep(1)
                                else:
                                    raise db_error
                    except Exception as e:
                        pass
        
        return {
            "success": True,
            "item_id": request.item_id,
            "comps": valid_comps
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        raise HTTPException(500, f"Failed to generate comps: {str(e)}")


@app.get("/comps/{item_id}")
def get_comps_for_item(item_id: str):
    """
    Get all saved comps for a specific item
    """
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Verify item exists
            item = supabase.table("items").select("item_id").eq("item_id", item_id).execute()
            if not item.data:
                raise HTTPException(404, "Item not found")
            
            # Get all comps for this item
            comps = supabase.table("comps").select("*").eq("item_id", item_id).order("created_at", desc=True).execute()
            
            return {
                "item_id": item_id,
                "comps": comps.data if comps.data else []
            }
        
        except httpx.ReadError as e:
            if attempt < max_retries - 1:
                import time
                time.sleep(0.5)
            else:
                raise HTTPException(503, "Database connection timeout. Please try again.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Failed to retrieve comps: {str(e)}")


# ============================================
# BATCH COMPS GENERATION ENDPOINTS
# ============================================

class BatchCompsRequest(BaseModel):
    """Request model for batch comps generation"""
    items: List[dict]  # List of items with item_id, brand, model, year, notes

class BatchCompsResponse(BaseModel):
    """Response model for batch comps creation"""
    batch_id: str
    status: str
    total_items: int
    message: str

# ============================================
# BIDDING SYSTEM MODELS
# ============================================

class AuctionSettingsUpdate(BaseModel):
    """Request model for updating auction settings"""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None  # 'draft', 'published', 'closed'
    pickup_location: Optional[str] = None
    shipping_allowed: Optional[bool] = None

class ItemAuctionSettings(BaseModel):
    """Request model for item auction settings"""
    starting_bid: Optional[float] = None
    min_increment: Optional[float] = None
    buy_now_price: Optional[float] = None
    lot: Optional[int] = None
    is_listed: Optional[bool] = None

class BatchItemAuctionSettings(BaseModel):
    """Request model for batch updating item auction settings"""
    item_ids: List[str]
    starting_bid: Optional[float] = None
    min_increment: Optional[float] = None
    buy_now_price: Optional[float] = None
    is_listed: Optional[bool] = None

class BidRequest(BaseModel):
    """Request model for placing a bid"""
    bidder_email: str
    bidder_name: str
    bid_amount: float

class BuyNowRequest(BaseModel):
    """Request model for buy now purchase"""
    buyer_email: str
    buyer_name: str

@app.post("/comps/batch")
async def create_comps_batch(request: BatchCompsRequest):
    """
    Process comps for multiple items in parallel using agents with WebSearchTool.
    Returns immediately with all results (not a background job).
    
    Request body:
    {
        "items": [
            {"item_id": "abc", "brand": "Rolex", "model": "Submariner", "year": "2020", "notes": ""},
            {"item_id": "def", "brand": "Omega", "model": "Speedmaster", "year": "2019", "notes": ""}
        ]
    }
    """
    try:
        if not request.items or len(request.items) == 0:
            raise HTTPException(400, "Items list cannot be empty")
        
        if len(request.items) > 100:
            raise HTTPException(400, "Batch size cannot exceed 100 items for parallel processing")
        
        # validate openai key
        if not OPENAI_COMPS_KEY:
            raise HTTPException(500, "OpenAI Comps API key not configured")
        
        # set openai api key for agents
        os.environ["OPENAI_API_KEY"] = OPENAI_COMPS_KEY
        
        # create function to process single item
        async def process_single_item(item_data):
            item_id = item_data.get("item_id")
            brand = item_data.get("brand", "Unknown")
            model = item_data.get("model", "Unknown")
            year = item_data.get("year", "Unknown")
            notes = item_data.get("notes", "")
            
            try:
                # use same agent logic as single comps endpoint
                comps_request = CompsRequest(
                    item_id=item_id,
                    brand=brand,
                    model=model,
                    year=year,
                    notes=notes
                )
                
                # call single comps generation function
                result = await generate_comps_simple(comps_request)
                
                return {
                    "item_id": item_id,
                    "success": True,
                    "comps": result["comps"]
                }
                
            except Exception as e:
                return {
                    "item_id": item_id,
                    "success": False,
                    "error": str(e)
                }
        
        # process all items in parallel
        tasks = [process_single_item(item) for item in request.items]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # count successes and failures
        successful = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
        failed = len(results) - successful
        
        return {
            "batch_id": f"sync-{int(time.time())}",  # Generate a simple ID for tracking
            "status": "completed",
            "total_items": len(results),
            "successful": successful,
            "failed": failed,
            "results": results,
            "message": f"Batch processing complete. {successful}/{len(results)} items processed successfully."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        raise HTTPException(500, f"Failed to process batch: {str(e)}")


# ============================================
# BIDDING SYSTEM ENDPOINTS
# ============================================

# UPDATE auction settings (start/end time, location, shipping)
@app.put("/auctions/{auction_id}/settings")
def update_auction_settings(auction_id: str, settings: AuctionSettingsUpdate):
    """Update auction settings including start/end time and pickup/shipping options"""
    # Check auction exists
    auction = supabase.table("auctions").select("*").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")
    
    # Build update dict
    updates = {}
    if settings.start_time is not None:
        updates["start_time"] = settings.start_time
    if settings.end_time is not None:
        updates["end_time"] = settings.end_time
    if settings.status is not None:
        if settings.status not in ["draft", "published", "closed"]:
            raise HTTPException(400, "Status must be 'draft', 'published', or 'closed'")
        updates["status"] = settings.status
    if settings.pickup_location is not None:
        updates["pickup_location"] = settings.pickup_location
    if settings.shipping_allowed is not None:
        updates["shipping_allowed"] = settings.shipping_allowed
    
    if not updates:
        raise HTTPException(400, "No settings to update")
    
    res = supabase.table("auctions").update(updates).eq("auction_id", auction_id).execute()
    if not res.data:
        raise HTTPException(500, "Failed to update auction settings")
    
    return res.data[0]


# PUBLISH auction (set status to published)
@app.post("/auctions/{auction_id}/publish")
def publish_auction(auction_id: str):
    """Publish an auction - makes it visible to public"""
    auction = supabase.table("auctions").select("*").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")
    
    # Verify auction has required fields
    auction_data = auction.data[0]
    if not auction_data.get("start_time") or not auction_data.get("end_time"):
        raise HTTPException(400, "Auction must have start and end times before publishing")
    
    res = supabase.table("auctions").update({"status": "published"}).eq("auction_id", auction_id).execute()
    if not res.data:
        raise HTTPException(500, "Failed to publish auction")
    
    return {"message": "Auction published successfully", "auction": res.data[0]}


# CLOSE auction (set status to closed)
@app.post("/auctions/{auction_id}/close")
def close_auction(auction_id: str):
    """Close an auction - no more bids accepted"""
    auction = supabase.table("auctions").select("*").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")
    
    res = supabase.table("auctions").update({"status": "closed"}).eq("auction_id", auction_id).execute()
    if not res.data:
        raise HTTPException(500, "Failed to close auction")
    
    return {"message": "Auction closed successfully", "auction": res.data[0]}


# GET public auction details (for public viewing)
@app.get("/auctions/{auction_id}/public")
def get_public_auction(auction_id: str):
    """Get auction details for public viewing - includes items with bids"""
    auction = supabase.table("auctions").select("*").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")
    
    auction_data = auction.data[0]
    
    # Only show listed items if auction is published or closed
    # For draft auctions, show all items (for preview) but mark as preview
    # For published/closed auctions, only show is_listed=true items
    if auction_data.get("status") in ["published", "closed"]:
        items = supabase.table("items").select("*").eq("auction_id", auction_id).eq("is_listed", True).order("created_at", desc=False).execute()
    else:
        # For draft/preview, show all items so seller can preview
        items = supabase.table("items").select("*").eq("auction_id", auction_id).order("created_at", desc=False).execute()
    
    items_data = items.data if items.data else []
    
    # Get images for all items
    if items_data:
        item_ids = [item["item_id"] for item in items_data]
        images = supabase.table("item_images").select("*").in_("item_id", item_ids).execute()
        images_data = images.data if images.data else []
        
        # Group images by item_id
        images_by_item = {}
        for img in images_data:
            iid = img["item_id"]
            if iid not in images_by_item:
                images_by_item[iid] = []
            images_by_item[iid].append(img)
        
        # Batch fetch all bids for all items (instead of N+1 queries)
        all_bids = supabase.table("bids").select("*").in_("item_id", item_ids).order("amount", desc=True).execute()
        all_bids_data = all_bids.data if all_bids.data else []
        
        # Group bids by item_id and calculate highest bid + count
        bids_by_item = {}
        bid_counts = {}
        for bid in all_bids_data:
            iid = bid["item_id"]
            if iid not in bids_by_item:
                bids_by_item[iid] = bid  # First bid is highest (ordered desc)
                bid_counts[iid] = 0
            bid_counts[iid] += 1
        
        # Assign images and bid info to each item
        for item in items_data:
            item["images"] = images_by_item.get(item["item_id"], [])
            
            highest_bid = bids_by_item.get(item["item_id"])
            if highest_bid:
                item["current_bid"] = highest_bid["amount"]
                item["bid_count"] = bid_counts.get(item["item_id"], 0)
            else:
                item["current_bid"] = item.get("starting_bid", 0) or 0
                item["bid_count"] = 0
    
    return {
        "auction": auction_data,
        "items": items_data
    }


# GET all public auctions (published only)
@app.get("/auctions/public")
def list_public_auctions():
    """List all published auctions for public browsing"""
    auctions = supabase.table("auctions").select("*").eq("status", "published").order("created_at", desc=True).execute()
    return {"auctions": auctions.data if auctions.data else []}


# BATCH update item auction settings (must be before /items/{item_id}/auction-settings to avoid route conflict)
@app.put("/items/batch/auction-settings")
def batch_update_item_auction_settings(settings: BatchItemAuctionSettings):
    """Batch update auction settings for multiple items"""
    if not settings.item_ids:
        raise HTTPException(400, "No items specified")
    
    updates = {}
    if settings.starting_bid is not None:
        updates["starting_bid"] = settings.starting_bid
    if settings.min_increment is not None:
        updates["min_increment"] = settings.min_increment
    if settings.buy_now_price is not None:
        updates["buy_now_price"] = settings.buy_now_price
    if settings.is_listed is not None:
        updates["is_listed"] = settings.is_listed
    
    if not updates:
        raise HTTPException(400, "No settings to update")
    
    # Update all items in a single query using .in_() filter
    res = supabase.table("items").update(updates).in_("item_id", settings.item_ids).execute()
    updated_items = res.data if res.data else []
    
    return {
        "message": f"Updated {len(updated_items)} items",
        "items": updated_items
    }


# UPDATE item auction settings
@app.put("/items/{item_id}/auction-settings")
def update_item_auction_settings(item_id: str, settings: ItemAuctionSettings):
    """Update auction-specific settings for an item"""
    item = supabase.table("items").select("item_id").eq("item_id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")
    
    updates = {}
    if settings.starting_bid is not None:
        updates["starting_bid"] = settings.starting_bid
    if settings.min_increment is not None:
        updates["min_increment"] = settings.min_increment
    if settings.buy_now_price is not None:
        updates["buy_now_price"] = settings.buy_now_price
    if settings.lot is not None:
        updates["lot"] = settings.lot
    if settings.is_listed is not None:
        updates["is_listed"] = settings.is_listed
    
    if not updates:
        raise HTTPException(400, "No settings to update")
    
    res = supabase.table("items").update(updates).eq("item_id", item_id).execute()
    if not res.data:
        raise HTTPException(500, "Failed to update item auction settings")
    
    return res.data[0]


# PLACE a bid on an item (or price guess for demo auctions)
@app.post("/items/{item_id}/bid")
def place_bid(item_id: str, bid: BidRequest):
    """Place a bid on an item (or price guess for demo auctions)"""
    # Get item and verify it exists
    item = supabase.table("items").select("*, auctions(*)").eq("item_id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")
    
    item_data = item.data[0]
    auction_data = item_data.get("auctions", {})
    
    # Check if this is a demo auction
    is_demo = auction_data.get("is_demo", False)
    
    # Check auction is published
    if auction_data.get("status") != "published":
        raise HTTPException(400, "Auction is not active")
    
    # Check auction hasn't ended
    from datetime import datetime
    end_time = auction_data.get("end_time")
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            if datetime.now(end_dt.tzinfo) > end_dt:
                raise HTTPException(400, "Auction has ended")
        except ValueError:
            pass
    
    # Check item isn't sold
    if item_data.get("is_sold"):
        raise HTTPException(400, "Item has already been sold")
    
    # For demo auctions, skip minimum bid validation - any positive amount is valid (max $100,000)
    if is_demo:
        if bid.bid_amount <= 0:
            raise HTTPException(400, "Guess must be a positive amount")
        if bid.bid_amount > 100000:
            raise HTTPException(400, "Guess must be under $100,000")
    else:
        # Regular auction - enforce minimum bid requirements
        # Get current highest bid
        current_bids = supabase.table("bids").select("*").eq("item_id", item_id).order("amount", desc=True).limit(1).execute()
        
        starting_bid = item_data.get("starting_bid", 0) or 0
        min_increment = item_data.get("min_increment", 1) or 1
        
        # If there are existing bids, new bid must be higher than current + increment
        # If no bids yet, allow bidding at exactly the starting bid
        if current_bids.data:
            current_highest = current_bids.data[0]["amount"]
            min_required = current_highest + min_increment
        else:
            # No bids yet - allow the starting bid amount
            min_required = starting_bid
        
        if bid.bid_amount < min_required:
            raise HTTPException(400, f"Bid must be at least ${min_required:.2f}")
    
    # Generate a UUID for guest bidders based on their email (consistent per email)
    import hashlib
    # Create a deterministic UUID from email so same bidder gets same ID
    email_hash = hashlib.md5(bid.bidder_email.lower().encode()).hexdigest()
    guest_bidder_id = f"{email_hash[:8]}-{email_hash[8:12]}-{email_hash[12:16]}-{email_hash[16:20]}-{email_hash[20:32]}"
    
    # Insert bid (or guess for demo)
    bid_result = supabase.table("bids").insert({
        "item_id": item_id,
        "bidder_id": guest_bidder_id,
        "bidder_email": bid.bidder_email,
        "bidder_name": bid.bidder_name,
        "amount": bid.bid_amount
    }).execute()
    
    if not bid_result.data:
        raise HTTPException(500, "Failed to place bid")
    
    # Update item's current_bid (for regular auctions)
    if not is_demo:
        supabase.table("items").update({"current_bid": bid.bid_amount}).eq("item_id", item_id).execute()
    
    return {
        "message": "Guess recorded successfully" if is_demo else "Bid placed successfully",
        "bid": bid_result.data[0],
        "current_highest": bid.bid_amount,
        "is_demo": is_demo
    }


# BUY NOW - purchase item immediately
@app.post("/items/{item_id}/buy-now")
def buy_now(item_id: str, purchase: BuyNowRequest):
    """Purchase an item at buy now price"""
    from datetime import datetime, timezone
    
    # Get item
    item = supabase.table("items").select("*, auctions(*)").eq("item_id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")
    
    item_data = item.data[0]
    auction_data = item_data.get("auctions", {})
    
    # Check auction is published
    if auction_data.get("status") != "published":
        raise HTTPException(400, "Auction is not active")
    
    # Check item isn't already sold
    if item_data.get("is_sold"):
        raise HTTPException(400, "Item has already been sold")
    
    # Check buy now price exists
    buy_now_price = item_data.get("buy_now_price")
    if not buy_now_price:
        raise HTTPException(400, "Buy now not available for this item")
    
    # Create order (note: buyer_id is required, we'll generate a placeholder UUID)
    order_result = supabase.table("orders").insert({
        "item_id": item_id,
        "auction_id": item_data.get("auction_id"),
        "buyer_id": "00000000-0000-0000-0000-000000000000",  # Placeholder for guest buyers
        "buyer_email": purchase.buyer_email,
        "buyer_name": purchase.buyer_name,
        "amount": buy_now_price,
        "order_type": "buy_now"
    }).execute()
    
    if not order_result.data:
        raise HTTPException(500, "Failed to create order")
    
    # Mark item as sold
    supabase.table("items").update({
        "is_sold": True,
        "sold_at": datetime.now(timezone.utc).isoformat()
    }).eq("item_id", item_id).execute()
    
    return {
        "message": "Purchase successful",
        "order": order_result.data[0]
    }


# GET bids for an item
@app.get("/items/{item_id}/bids")
def get_item_bids(item_id: str):
    """Get all bids for an item"""
    item = supabase.table("items").select("item_id").eq("item_id", item_id).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")
    
    bids = supabase.table("bids").select("*").eq("item_id", item_id).order("amount", desc=True).execute()
    
    return {
        "item_id": item_id,
        "bids": bids.data if bids.data else []
    }


# GET all bids for an auction (for seller bid tracking)
@app.get("/auctions/{auction_id}/all-bids")
def get_auction_bids(auction_id: str):
    """Get all bids for all items in an auction - for seller to track bidding"""
    # Verify auction exists
    auction = supabase.table("auctions").select("auction_id, auction_name, status").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")
    
    # Get all items for this auction (use 'title' not 'name')
    items = supabase.table("items").select("item_id, title, starting_bid, min_increment, is_sold, buy_now_price, is_listed").eq("auction_id", auction_id).execute()
    
    if not items.data:
        return {"auction": auction.data[0], "items_with_bids": []}
    
    items_with_bids = []
    for item in items.data:
        # Get bids for this item
        bids = supabase.table("bids").select("*").eq("item_id", item["item_id"]).order("amount", desc=True).execute()
        items_with_bids.append({
            **item,
            "name": item.get("title", "Untitled"),  # Map title to name for frontend
            "bids": bids.data if bids.data else [],
            "bid_count": len(bids.data) if bids.data else 0,
            "highest_bid": bids.data[0]["amount"] if bids.data else None
        })
    
    return {
        "auction": auction.data[0],
        "items_with_bids": items_with_bids
    }


# GET single order
@app.get("/orders/{order_id}")
def get_order(order_id: str):
    """Get order details"""
    order = supabase.table("orders").select("*, items(*)").eq("order_id", order_id).execute()
    if not order.data:
        raise HTTPException(404, "Order not found")
    
    return order.data[0]


# GET orders for a user (by email)
@app.get("/orders")
def list_orders(buyer_email: str = None, auction_id: str = None):
    """List orders by buyer email or auction"""
    query = supabase.table("orders").select("*, items(*)")
    
    if buyer_email:
        query = query.eq("buyer_email", buyer_email)
    if auction_id:
        query = query.eq("auction_id", auction_id)
    
    orders = query.order("created_at", desc=True).execute()
    
    return {"orders": orders.data if orders.data else []}


# ============================================
# DEMO MODE ENDPOINTS
# ============================================

# GET demo results - calculate winners based on closest guess to comp price
@app.get("/auctions/{auction_id}/demo-results")
def get_demo_results(auction_id: str):
    """Get demo auction results - winner is closest to average comp price"""
    # Get auction and verify it's a demo
    auction = supabase.table("auctions").select("*").eq("auction_id", auction_id).execute()
    if not auction.data:
        raise HTTPException(404, "Auction not found")
    
    auction_data = auction.data[0]
    if not auction_data.get("is_demo"):
        raise HTTPException(400, "This is not a demo auction")
    
    # Get all items with their comps
    items = supabase.table("items").select("*").eq("auction_id", auction_id).execute()
    if not items.data:
        return {"results": []}
    
    # Get images for all items
    item_ids = [item["item_id"] for item in items.data]
    images = supabase.table("item_images").select("*").in_("item_id", item_ids).order("position").execute()
    images_data = images.data if images.data else []
    
    # Group images by item_id
    images_by_item = {}
    for img in images_data:
        iid = img["item_id"]
        if iid not in images_by_item:
            images_by_item[iid] = []
        images_by_item[iid].append(img)
    
    results = []
    for item in items.data:
        item_id = item["item_id"]
        
        # Attach images to item
        item["images"] = images_by_item.get(item_id, [])
        
        # Get comps for this item
        comps = supabase.table("comps").select("*").eq("item_id", item_id).execute()
        comp_prices = [c["sold_price"] for c in comps.data] if comps.data else []
        
        # Calculate average comp price (the "correct" answer)
        if comp_prices:
            avg_comp_price = sum(comp_prices) / len(comp_prices)
        else:
            avg_comp_price = 0
        
        # Get all guesses (bids) for this item
        guesses = supabase.table("bids").select("*").eq("item_id", item_id).order("created_at").execute()
        
        # Find the closest guess to the average comp price
        winner = None
        closest_diff = float('inf')
        
        guesses_with_diff = []
        for guess in (guesses.data or []):
            diff = abs(guess["amount"] - avg_comp_price)
            guesses_with_diff.append({
                **guess,
                "difference": diff
            })
            if diff < closest_diff:
                closest_diff = diff
                winner = guess
        
        # Sort guesses by how close they are
        guesses_with_diff.sort(key=lambda x: x["difference"])
        
        results.append({
            "item": item,
            "avg_comp_price": avg_comp_price,
            "comp_count": len(comp_prices),
            "guesses": guesses_with_diff,
            "winner": winner,
            "winner_difference": closest_diff if winner else None
        })
    
    return {"results": results, "auction": auction_data}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8081))
    uvicorn.run(app, host="127.0.0.1", port=port)