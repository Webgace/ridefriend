// Ficheiro: src/types/supabase.ts | Função: tipos do esquema Supabase v2.1
// Mantém-se em sincronia com supabase_setup_v2.sql.

export type ContactGroup = 'family' | 'friend' | 'colleague' | 'neighbour';
export type LocationModeDb = 'passenger' | 'driver';
export type RideStatusDb = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          name: string;
          email: string | null;
          photo_url: string | null;
          home_area: string | null;
          is_driver: boolean;
          is_admin: boolean;
          terms_accepted_at: string | null;
          rating_avg: number;
          ride_count: number;
          expo_push_token: string | null;
          market_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone: string;
          name: string;
          email?: string | null;
          photo_url?: string | null;
          home_area?: string | null;
          is_driver?: boolean;
          is_admin?: boolean;
          terms_accepted_at?: string | null;
          rating_avg?: number;
          ride_count?: number;
          expo_push_token?: string | null;
          market_code?: string;
        };
        Update: {
          phone?: string;
          name?: string;
          email?: string | null;
          photo_url?: string | null;
          home_area?: string | null;
          is_driver?: boolean;
          is_admin?: boolean;
          terms_accepted_at?: string | null;
          rating_avg?: number;
          ride_count?: number;
          expo_push_token?: string | null;
          market_code?: string;
        };
      };

      contacts: {
        Row: {
          id: string;
          user_id: string;
          contact_user_id: string | null;
          group_type: ContactGroup;
          alias_name: string | null;
          alias_phone: string | null;
          phone_normalized: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_user_id?: string | null;
          group_type?: ContactGroup;
          alias_name?: string | null;
          alias_phone?: string | null;
        };
        Update: {
          contact_user_id?: string | null;
          group_type?: ContactGroup;
          alias_name?: string | null;
          alias_phone?: string | null;
        };
      };

      locations: {
        Row: {
          id: string;
          user_id: string;
          lat: number;
          lng: number;
          accuracy: number | null;
          mode: LocationModeDb;
          is_active: boolean;
          heading: number | null;
          speed: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lat: number;
          lng: number;
          accuracy?: number | null;
          mode?: LocationModeDb;
          is_active?: boolean;
          heading?: number | null;
          speed?: number | null;
        };
        Update: {
          lat?: number;
          lng?: number;
          accuracy?: number | null;
          mode?: LocationModeDb;
          is_active?: boolean;
          heading?: number | null;
          speed?: number | null;
        };
      };

      rides: {
        Row: {
          id: string;
          driver_id: string;
          passenger_id: string;
          status: RideStatusDb;
          origin_lat: number;
          origin_lng: number;
          dest_lat: number | null;
          dest_lng: number | null;
          distance_km: number | null;
          started_at: string | null;
          ended_at: string | null;
          market_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          passenger_id: string;
          status?: RideStatusDb;
          origin_lat: number;
          origin_lng: number;
          dest_lat?: number | null;
          dest_lng?: number | null;
          distance_km?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
          market_code?: string;
        };
        Update: {
          status?: RideStatusDb;
          dest_lat?: number | null;
          dest_lng?: number | null;
          distance_km?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
        };
      };

      ratings: {
        Row: {
          id: string;
          ride_id: string;
          rater_id: string;
          rated_id: string;
          score: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          rater_id: string;
          rated_id: string;
          score: number;
          comment?: string | null;
        };
        Update: {
          score?: number;
          comment?: string | null;
        };
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          payload: Record<string, unknown>;
          is_read: boolean;
          market_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          payload?: Record<string, unknown>;
          is_read?: boolean;
          market_code?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };

      sos_events: {
        Row: {
          id: string;
          user_id: string;
          ride_id: string | null;
          lat: number;
          lng: number;
          triggered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ride_id?: string | null;
          lat: number;
          lng: number;
        };
        Update: never;
      };

      bus_stops: {
        Row: {
          id: string;
          market_code: string;
          city: string;
          name: string;
          lat: number;
          lng: number;
          is_major: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          market_code: string;
          city: string;
          name: string;
          lat: number;
          lng: number;
          is_major?: boolean;
        };
        Update: never;
      };

      app_config: {
        Row: {
          key: string;
          value: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value?: string | null;
          updated_by?: string | null;
        };
        Update: {
          value?: string | null;
          updated_by?: string | null;
        };
      };

      banners: {
        Row: {
          id: string;
          title: string;
          body: string | null;
          image_url: string | null;
          cta_label: string | null;
          cta_url: string | null;
          market_code: string | null;
          starts_at: string | null;
          ends_at: string | null;
          priority: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body?: string | null;
          image_url?: string | null;
          cta_label?: string | null;
          cta_url?: string | null;
          market_code?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          priority?: number;
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: {
          title?: string;
          body?: string | null;
          image_url?: string | null;
          cta_label?: string | null;
          cta_url?: string | null;
          market_code?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          priority?: number;
          is_active?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      nearby_drivers: {
        Args: { p_user_id: string; p_radius_km: number };
        Returns: Array<{
          driver_id: string;
          name: string;
          phone: string;
          photo_url: string | null;
          rating_avg: number;
          group_type: ContactGroup;
          lat: number;
          lng: number;
          heading: number | null;
          speed: number | null;
          distance_km: number;
          eta_minutes: number;
        }>;
      };
      nearby_passengers: {
        Args: {
          p_driver_id: string;
          p_origin_lat: number;
          p_origin_lng: number;
          p_dest_lat: number;
          p_dest_lng: number;
          p_radius_m: number;
        };
        Returns: Array<{
          passenger_id: string;
          name: string;
          phone: string;
          photo_url: string | null;
          group_type: ContactGroup;
          lat: number;
          lng: number;
          detour_m: number;
        }>;
      };
      nearby_passengers_at_stop: {
        Args: { p_user_id: string; p_radius_m: number };
        Returns: Array<{
          passenger_id: string;
          name: string;
          phone: string;
          photo_url: string | null;
          group_type: ContactGroup;
          lat: number;
          lng: number;
          distance_m: number;
        }>;
      };
      nearest_stop: {
        Args: { p_lat: number; p_lng: number; p_market: string; p_radius_m: number };
        Returns: Array<{
          id: string;
          name: string;
          city: string;
          lat: number;
          lng: number;
          is_major: boolean;
          distance_m: number;
        }>;
      };
    };
    Enums: {
      contact_group: ContactGroup;
      location_mode: LocationModeDb;
      ride_status: RideStatusDb;
    };
    CompositeTypes: Record<string, never>;
  };
};
