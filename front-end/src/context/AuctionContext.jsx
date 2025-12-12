// AuctionContext - Global state management for auctions, items, and images
import { createContext, useContext, useReducer, useEffect } from 'react';
import { fetchAllUserData } from '../services/api';
import { useAuth } from './AuthContext';

const initialState = {
  auctions: [],
  items: [],
  itemImages: [],
  comps: [],
  loading: true,
  error: null
};

export const ActionTypes = {
  CREATE_AUCTION: 'CREATE_AUCTION',
  UPDATE_AUCTION: 'UPDATE_AUCTION',
  DELETE_AUCTION: 'DELETE_AUCTION',
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  DELETE_ITEM: 'DELETE_ITEM',
  ADD_ITEM_IMAGE: 'ADD_ITEM_IMAGE',
  DELETE_ITEM_IMAGE: 'DELETE_ITEM_IMAGE',
  SET_ITEM_IMAGES: 'SET_ITEM_IMAGES',
  ADD_COMP: 'ADD_COMP',
  LOAD_ALL_DATA: 'LOAD_ALL_DATA',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

function auctionReducer(state, action) {
  switch (action.type) {
    case ActionTypes.CREATE_AUCTION:
      return {
        ...state,
        auctions: [
          ...state.auctions,
          {
            auction_id: action.payload.auction_id,
            auction_name: action.payload.auction_name,
            profile_id: action.payload.profile_id,
            status: action.payload.status || 'draft',
            created_at: action.payload.created_at || new Date().toISOString()
          }
        ]
      };

    case ActionTypes.UPDATE_AUCTION:
      return {
        ...state,
        auctions: state.auctions.map(auction =>
          auction.auction_id === action.payload.auction_id
            ? { ...auction, ...action.payload.updates }
            : auction
        )
      };

    case ActionTypes.DELETE_AUCTION:
      const auctionIdToDelete = action.payload.auction_id;
      return {
        ...state,
        auctions: state.auctions.filter(a => a.auction_id !== auctionIdToDelete),
        items: state.items.filter(i => i.auction_id !== auctionIdToDelete),
        itemImages: state.itemImages.filter(img => {
          const item = state.items.find(i => i.item_id === img.item_id);
          return item?.auction_id !== auctionIdToDelete;
        }),
        comps: state.comps.filter(comp => {
          const item = state.items.find(i => i.item_id === comp.item_id);
          return item?.auction_id !== auctionIdToDelete;
        })
      };


    case ActionTypes.ADD_ITEM:
      const newItem = {
        item_id: action.payload.item_id || uuidv4(),
        auction_id: action.payload.auction_id,
        title: action.payload.title,
        brand: action.payload.brand,
        model: action.payload.model,
        year: action.payload.year,
        description: action.payload.description || '',
        ai_description: action.payload.ai_description || '',
        created_at: action.payload.created_at || new Date().toISOString()
      };
      return {
        ...state,
        items: [...state.items, newItem]
      };

    case ActionTypes.UPDATE_ITEM:
      return {
        ...state,
        items: state.items.map(item =>
          item.item_id === action.payload.item_id
            ? { ...item, ...action.payload.updates }
            : item
        )
      };

    case ActionTypes.DELETE_ITEM:
      return {
        ...state,
        items: state.items.filter(item => item.item_id !== action.payload.item_id),
        itemImages: state.itemImages.filter(img => img.item_id !== action.payload.item_id),
        comps: state.comps.filter(comp => comp.item_id !== action.payload.item_id)
      };

    case ActionTypes.ADD_ITEM_IMAGE:
      return {
        ...state,
        itemImages: [
          ...state.itemImages,
          {
            image_id: Date.now(),
            item_id: action.payload.item_id,
            url: action.payload.url,
            created_at: new Date().toISOString()
          }
        ]
      };

    case ActionTypes.DELETE_ITEM_IMAGE:
      return {
        ...state,
        itemImages: state.itemImages.filter(img => img.image_id !== action.payload.image_id)
      };

    case ActionTypes.SET_ITEM_IMAGES:
      return {
        ...state,
        itemImages: [
          ...state.itemImages.filter(img => img.item_id !== action.payload.item_id),
          ...action.payload.images
        ]
      };

    case ActionTypes.ADD_COMP:
      return {
        ...state,
        comps: [
          ...state.comps,
          {
            id: Date.now() + Math.random(),
            item_id: action.payload.item_id,
            source: action.payload.source,
            source_url: action.payload.source_url,
            sold_price: action.payload.sold_price,
            currency: action.payload.currency,
            sold_at: action.payload.sold_at,
            notes: action.payload.notes,
            created_at: new Date().toISOString()
          }
        ]
      };

    case ActionTypes.LOAD_ALL_DATA:
      return {
        ...state,
        auctions: action.payload.auctions,
        items: action.payload.items,
        itemImages: action.payload.itemImages,
        comps: action.payload.comps,
        loading: false,
        error: null
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    default:
      return state;
  }
}

const AuctionContext = createContext(null);

export function AuctionProvider({ children }) {
  const [state, dispatch] = useReducer(auctionReducer, initialState);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        dispatch({
          type: ActionTypes.LOAD_ALL_DATA,
          payload: {
            auctions: [],
            items: [],
            itemImages: [],
            comps: []
          }
        });
        return;
      }

      try {
        dispatch({ type: ActionTypes.SET_LOADING, payload: true });
        const profileId = user.id;
        const data = await fetchAllUserData(profileId);
        
        const itemImages = [];
        data.items.forEach(item => {
          if (item.images && item.images.length > 0) {
            item.images.forEach(img => {
              itemImages.push({
                image_id: img.image_id,
                item_id: item.item_id,
                url: img.url,
                position: img.position,
                created_at: img.created_at
              });
            });
          }
        });
        
        dispatch({
          type: ActionTypes.LOAD_ALL_DATA,
          payload: {
            auctions: data.auctions,
            items: data.items,
            itemImages: itemImages,
            comps: data.allComps
          }
        });
      } catch (error) {
        console.error('Failed to load user data:', error);
        dispatch({ 
          type: ActionTypes.SET_ERROR, 
          payload: 'Failed to load data. Please refresh the page.' 
        });
      }
    };

    loadData();
  }, [user]);

  const getAuctionItems = auctionId =>
    state.items.filter(item => item.auction_id === auctionId);

  const getAuctionStats = () => ({
    totalAuctions: state.auctions.length,
    totalItems: state.items.length,
    totalImages: state.itemImages.length
  });

  return (
    <AuctionContext.Provider value={{ state, dispatch, getAuctionItems, getAuctionStats }}>
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
}
