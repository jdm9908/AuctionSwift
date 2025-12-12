import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ImageUploadZone } from './ImageUploadZone';
import { ActionTypes, useAuction } from '../context/AuctionContext';
import { createItem, generateComps, generateItemDescription, updateItemImage, addItemImages, createCompsBatch, getBatchStatus, getBatchResults } from '../services/api';
import { uploadItemImage } from '../services/storage';

export function ItemMultiForm({ auctionId }) {
  const { dispatch } = useAuction();
  const [loading, setLoading] = useState(false);
  const [generatingDescFor, setGeneratingDescFor] = useState(null);
  const [error, setError] = useState('');
  const [items, setItems] = useState([
    {
      tempId: crypto.randomUUID(),
      brand: '',
      model: '',
      year: '',
      notes: '', // Manual condition notes (scratches, dents, etc.)
      aiDescription: '', // AI-generated 3-sentence description
      imageFiles: [] // Up to 5 images per item
    }
  ]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        tempId: crypto.randomUUID(),
        brand: '',
        model: '',
        year: '',
        notes: '',
        aiDescription: '',
        imageFiles: [] // Up to 5 images per item
      }
    ]);
  };

  const handleRemoveItem = (tempId) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.tempId !== tempId));
    }
  };

  const handleItemChange = (tempId, field, value) => {
    setItems(items.map(item => 
      item.tempId === tempId 
        ? { ...item, [field]: value }
        : item
    ));
  };

  const handleImagesChange = (tempId, newImages) => {
    const files = newImages.map(img => img.file);
    setItems(prevItems => {
      const updated = prevItems.map(i => {
        if (i.tempId === tempId) {
          return { ...i, imageFiles: files };
        }
        return i;
      });
      return updated;
    });
  };

  const handleSaveItems = async () => {
    setLoading(true);
    setError('');

    try {
      // Filter items that have at least brand and model
      const validItems = items.filter(item => item.brand && item.model);
      
      if (validItems.length === 0) {
        setError('Please fill in at least one item with brand and model');
        setLoading(false);
        return;
      }

      const createdItems = [];

      // Create each item via API
      for (const item of validItems) {
        // Construct title as "Brand Model Year"
        const titleParts = [item.brand, item.model];
        if (item.year) {
          titleParts.push(item.year);
        }
        const title = titleParts.join(' ');

        // Generate AI description if first image is provided
        let aiDescription = item.aiDescription || '';
        
        if (item.imageFiles.length > 0 && item.imageFiles[0] && !aiDescription) {
          try {
            const response = await generateItemDescription(
              item.imageFiles[0], // Use first image for description
              title,
              item.model,
              item.year,
              item.notes
            );
            aiDescription = response.description;
            
            // Update the item state with the generated description so it shows in UI
            handleItemChange(item.tempId, 'aiDescription', aiDescription);
          } catch (aiError) {
            console.error(`Failed to generate AI description:`, aiError);
            // Continue without AI description
          }
        }

        // First, create the item in the backend to get an item_id
        const createdItem = await createItem({
          auctionId,
          title: title,
          imageUrl1: 'https://via.placeholder.com/400x300?text=Uploading...', // Temporary placeholder
          brand: item.brand,
          model: item.model,
          year: item.year ? parseInt(item.year) : null,
          aiDescription: aiDescription // Pass the AI-generated description
        });

        const itemId = createdItem.item.item_id;
        // --- SAVE AI DESCRIPTION TO BACKEND (important!) ---
        if (aiDescription) {
          try {
            await updateItem(itemId, { ai_description: aiDescription });
          } catch (err) {
            console.error("Failed to save AI description:", err);
          }
        }

        // Now upload all images to Supabase Storage
        const uploadedImages = [];
        
        if (item.imageFiles.length > 0) {
          for (let i = 0; i < Math.min(item.imageFiles.length, 5); i++) {
            const imageFile = item.imageFiles[i];
            if (imageFile) {
              try {
                const uploadResult = await uploadItemImage(imageFile, itemId);
                uploadedImages.push(uploadResult.url);
              } catch (uploadError) {
                console.error(`Failed to upload image ${i + 1}:`, uploadError);
              }
            }
          }
        }
        
        // Update the item with the first image URL
        const finalImageUrl = uploadedImages.length > 0 
          ? uploadedImages[0] 
          : 'https://via.placeholder.com/400x300?text=No+Image';
        
        // Update the item's first image URL in the backend
        try {
          const imageId = createdItem.images[0].image_id; // Get the first image ID
          await updateItemImage(itemId, imageId, finalImageUrl);
        } catch (uploadError) {
          console.error(`Failed to update first image for item ${itemId}:`, uploadError);
        }

        // Add additional images (2nd, 3rd, 4th, 5th) to the database
        if (uploadedImages.length > 1) {
          try {
            const additionalUrls = uploadedImages.slice(1);
            await addItemImages(itemId, additionalUrls);
          } catch (addImgError) {
            // Failed to add additional images - non-critical error
          }
        }

        createdItems.push({ ...createdItem, finalImageUrl, allImages: uploadedImages });

        // Update local state with the created item
        dispatch({
          type: ActionTypes.ADD_ITEM,
          payload: {
            item_id: itemId,
            auction_id: auctionId,
            title: createdItem.item.title,
            brand: createdItem.item.brand,
            model: createdItem.item.model,
            year: createdItem.item.year,
            ai_description: createdItem.item.ai_description || aiDescription, // Prefer backend response
            created_at: createdItem.item.created_at
          }
        });

        // Add ALL images to state
        uploadedImages.forEach((imgUrl, index) => {
          dispatch({
            type: ActionTypes.ADD_ITEM_IMAGE,
            payload: {
              item_id: itemId,
              url: imgUrl,
              position: index + 1
            }
          });
        });
      }

      // Now fetch comps for all created items using AI agent
      // Use BATCH API for 2+ items (50% cheaper), single requests for 1 item
      
      let totalCompsAdded = 0;
      
      if (createdItems.length >= 2) {
        // USE BATCH API FOR MULTIPLE ITEMS (50% cost savings)
        
        try {
          // Prepare batch request
          const batchItems = createdItems.map(ci => ({
            item_id: ci.item.item_id,
            brand: ci.item.brand || 'Unknown',
            model: ci.item.model || 'Unknown',
            year: ci.item.year ? ci.item.year.toString() : 'Unknown',
            notes: ''
          }));
          
          // Process all items in parallel (returns immediately with all results)
          const batchResponse = await createCompsBatch(batchItems);
          
          // Process results immediately (no polling needed)
          if (batchResponse.results && Array.isArray(batchResponse.results)) {
            batchResponse.results.forEach(result => {
              if (result.success && result.comps) {
                const comps = result.comps;
                
                // Process all 3 comps using a loop
                ['comp_1', 'comp_2', 'comp_3'].forEach(compKey => {
                  const comp = comps[compKey];
                  if (comp && comp.source !== 'none') {
                    const price = parseFloat(comp.price.replace(/[^0-9.]/g, '')) || 0;
                    dispatch({
                      type: ActionTypes.ADD_COMP,
                      payload: {
                        item_id: result.item_id,
                        source: comp.source,
                        source_url: comp.url,
                        sold_price: price,
                        currency: 'USD',
                        sold_at: comp.sale_date,
                        notes: comp.notes
                      }
                    });
                    totalCompsAdded++;
                  }
                });
              }
            });
          } else {
            console.error(`❌ Batch returned invalid response`);
          }
          
        } catch (batchError) {
          console.error('❌ Batch processing failed:', batchError);
          alert('Batch processing failed. Falling back to individual requests...');
          
          // Fallback to individual requests
          for (const createdItem of createdItems) {
            try {
              const item = createdItem.item;
              const compsResponse = await generateComps(
                item.item_id,
                item.brand,
                item.model,
                item.year ? item.year.toString() : null,
                null
              );
              
              if (compsResponse.success && compsResponse.comps) {
                // Process comps (same logic as below)
                const comps = compsResponse.comps;
                ['comp_1', 'comp_2', 'comp_3'].forEach(compKey => {
                  if (comps[compKey] && comps[compKey].source !== 'none') {
                    const price = parseFloat(comps[compKey].price.replace(/[^0-9.]/g, '')) || 0;
                    dispatch({
                      type: ActionTypes.ADD_COMP,
                      payload: {
                        item_id: item.item_id,
                        source: comps[compKey].source,
                        source_url: comps[compKey].url,
                        sold_price: price,
                        currency: 'USD',
                        sold_at: comps[compKey].sale_date,
                        notes: comps[compKey].notes
                      }
                    });
                    totalCompsAdded++;
                  }
                });
              }
            } catch (err) {
              console.error(`Failed for item ${createdItem.item.item_id}:`, err);
            }
          }
        }
        
      } else {
        // SINGLE ITEM - Use direct API call (immediate response)
        
        for (const createdItem of createdItems) {
          try {
            const item = createdItem.item;
            
            // Call the AI agent to generate comps
            const compsResponse = await generateComps(
              item.item_id,
              item.brand,
              item.model,
              item.year ? item.year.toString() : null,
              null // notes
            );
            
            // Add comps to state from the structured response
            if (compsResponse.success && compsResponse.comps) {
              const comps = compsResponse.comps;
              
              // Process all 3 comps using a loop (same as batch processing)
              ['comp_1', 'comp_2', 'comp_3'].forEach(compKey => {
                const comp = comps[compKey];
                if (comp && comp.source !== 'none') {
                  const price = parseFloat(comp.price.replace(/[^0-9.]/g, '')) || 0;
                  dispatch({
                    type: ActionTypes.ADD_COMP,
                    payload: {
                      item_id: item.item_id,
                      source: comp.source,
                      source_url: comp.url,
                      sold_price: price,
                      currency: 'USD',
                      sold_at: comp.sale_date,
                      notes: comp.notes
                    }
                  });
                  totalCompsAdded++;
                }
              });
            } else {
              console.warn(`No comps generated for item ${item.item_id}`);
            }
          } catch (compError) {
            console.error(`❌ Failed to generate comps for item ${createdItem.item.item_id}:`, compError);
          }
        }
      }

      // Reset form to single empty item
      setItems([
        {
          tempId: crypto.randomUUID(),
          brand: '',
          model: '',
          year: '',
          notes: '',
          aiDescription: '',
          imageFiles: []
        }
      ]);

      setLoading(false);
      // Success - items created and comps fetched
    } catch (err) {
      console.error('Error creating items:', err);
      setError(err.message || 'Failed to create items');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        {items.map((item, index) => {
          const itemTempId = item.tempId;
          const itemImageFiles = item.imageFiles;
          const itemBrand = item.brand;
          const itemModel = item.model;
          const itemYear = item.year;
          const itemNotes = item.notes;
          const itemAiDescription = item.aiDescription;
          
          return (
          <Card key={itemTempId} className="relative">
            <CardContent className="pt-6">
              {/* Item Number and Delete Button */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Item {index + 1}</h3>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(itemTempId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

      <div className="space-y-4">
                {/* Image Uploader */}
                <div>
                  <Label>Images (up to 5)</Label>
                  <div className="mt-2">
                    <ImageUploadZone
                      key={`image-zone-${itemTempId}`}
                      images={(() => {
                        return itemImageFiles.map((file, idx) => {
                          const preview = URL.createObjectURL(file);
                          return {
                            id: `${itemTempId}-${idx}`,
                            file,
                            preview,
                            isPrimary: idx === 0
                          };
                        });
                      })()}
                      onChange={(() => {
                        const boundHandler = handleImagesChange.bind(null, itemTempId);
                        return boundHandler;
                      })()}
                    />
                  </div>
                </div>

                {/* Brand and Model Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`brand-${itemTempId}`}>Brand *</Label>
                    <Input
                      id={`brand-${itemTempId}`}
                      value={itemBrand}
                      onChange={(e) => handleItemChange(itemTempId, 'brand', e.target.value)}
                      placeholder="e.g., Rolex, Omega"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`model-${itemTempId}`}>Model *</Label>
                    <Input
                      id={`model-${itemTempId}`}
                      value={itemModel}
                      onChange={(e) => handleItemChange(itemTempId, 'model', e.target.value)}
                      placeholder="e.g., Submariner, Speedmaster"
                      required
                    />
                  </div>
                </div>

                {/* Year */}
                <div>
                  <Label htmlFor={`year-${itemTempId}`}>Year (optional)</Label>
                  <Input
                    id={`year-${itemTempId}`}
                    type="number"
                    value={itemYear}
                    onChange={(e) => handleItemChange(itemTempId, 'year', e.target.value)}
                    placeholder="e.g., 2020"
                  />
                </div>

                {/* Condition Notes - User enters specific condition details */}
                <div>
                  <Label htmlFor={`notes-${itemTempId}`}>Condition Notes</Label>
                  <Textarea
                    id={`notes-${itemTempId}`}
                    value={itemNotes}
                    onChange={(e) => handleItemChange(itemTempId, 'notes', e.target.value)}
                    placeholder="Describe specific condition details: scratches, dents, wear, etc."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Enter specific condition details that the AI will include in the description.
                  </p>
                </div>

                {/* AI-Generated Description Preview */}
                {itemAiDescription && (
                  <div>
                    <Label>AI Description Preview</Label>
                    <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-800 leading-relaxed">{itemAiDescription}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This will be generated automatically when you save.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddItem}
          className="w-full"
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Item
        </Button>
        <Button
          type="button"
          onClick={handleSaveItems}
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading ? 'Saving & Generating Comps with AI...' : 'Save Items & Generate Comps (AI)'}
        </Button>
      </div>
    </div>
  );
}
