export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          description: string;
          start_date: string;
          end_date: string;
          image_url: string;
          link: string | null;
          status: "active" | "upcoming" | "expired";
          thumbnail_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          start_date: string;
          end_date: string;
          image_url: string;
          link?: string | null;
          status: "active" | "upcoming" | "expired";
          thumbnail_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      news: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string;
          content: string;
          cover: string;
          category: string;
          tags: string[];
          status: "draft" | "published";
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt: string;
          content: string;
          cover: string;
          category: string;
          tags?: string[];
          status: "draft" | "published";
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["news"]["Insert"]>;
      };
      gallery: {
        Row: {
          id: string;
          image_url: string;
          tag: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          tag: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gallery"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: "super_admin" | "admin" | "it" | "manager" | "support" | "user";
          views: number;
          is_banned: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role: "super_admin" | "admin" | "it" | "manager" | "support" | "user";
          views?: number;
          is_banned?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
      };
      admin_activity_logs: {
        Row: {
          id: string;
          actor_email: string;
          action: string;
          target_type: string;
          target_id: string | null;
          summary: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_email: string;
          action: string;
          target_type: string;
          target_id?: string | null;
          summary: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_activity_logs"]["Insert"]>;
      };
      news_ratings: {
        Row: {
          id: string;
          slug: string;
          title: string;
          anonymous_id: string;
          stars: number;
          review: string | null;
          admin_liked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          anonymous_id: string;
          stars: number;
          review?: string | null;
          admin_liked?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["news_ratings"]["Insert"]>;
      };
      rating_likes: {
        Row: {
          id: string;
          rating_id: string;
          anonymous_id: string;
          type: "like" | "unlike";
          created_at: string;
        };
        Insert: {
          id?: string;
          rating_id: string;
          anonymous_id: string;
          type: "like" | "unlike";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rating_likes"]["Insert"]>;
      };
      rating_replies: {
        Row: {
          id: string;
          rating_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          rating_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rating_replies"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
