export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_meal_items: {
        Row: {
          calories: number
          carbs: number
          fat: number
          food_name: string
          id: string
          meal_id: string
          protein: number
          weight_grams: number
        }
        Insert: {
          calories?: number
          carbs?: number
          fat?: number
          food_name: string
          id?: string
          meal_id: string
          protein?: number
          weight_grams: number
        }
        Update: {
          calories?: number
          carbs?: number
          fat?: number
          food_name?: string
          id?: string
          meal_id?: string
          protein?: number
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "custom_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_meals: {
        Row: {
          created_at: string
          id: string
          name: string
          total_calories: number
          total_carbs: number
          total_fat: number
          total_protein: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          animation_url: string | null
          calories_per_minute: number
          category: string
          description: string | null
          difficulty: string | null
          id: string
          muscle_groups: string[] | null
          name: string
          workout_type: string | null
        }
        Insert: {
          animation_url?: string | null
          calories_per_minute: number
          category: string
          description?: string | null
          difficulty?: string | null
          id?: string
          muscle_groups?: string[] | null
          name: string
          workout_type?: string | null
        }
        Update: {
          animation_url?: string | null
          calories_per_minute?: number
          category?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          muscle_groups?: string[] | null
          name?: string
          workout_type?: string | null
        }
        Relationships: []
      }
      fitness_groups: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "fitness_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          image_url: string | null
          message_type: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          message_type?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          message_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "fitness_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      nutrition_entries: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fat: number
          food_name: string
          id: string
          image_url: string | null
          meal_time: string | null
          protein: number
          serving_size: string | null
          user_id: string
          weight_grams: number | null
        }
        Insert: {
          calories: number
          carbs?: number
          created_at?: string
          fat?: number
          food_name: string
          id?: string
          image_url?: string | null
          meal_time?: string | null
          protein?: number
          serving_size?: string | null
          user_id: string
          weight_grams?: number | null
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          food_name?: string
          id?: string
          image_url?: string | null
          meal_time?: string | null
          protein?: number
          serving_size?: string | null
          user_id?: string
          weight_grams?: number | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          media_type: string | null
          post_type: string | null
          reference_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          media_type?: string | null
          post_type?: string | null
          reference_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          media_type?: string | null
          post_type?: string | null
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string | null
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          music_name: string | null
          user_id: string
          video_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          music_name?: string | null
          user_id: string
          video_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          music_name?: string | null
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reels: {
        Row: {
          created_at: string | null
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reels_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          media_type: string | null
          media_url: string
          music_name: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type?: string | null
          media_url: string
          music_name?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string
          music_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          bmr: number | null
          city: string | null
          country: string | null
          created_at: string
          daily_calories_target: number | null
          daily_carbs_target: number | null
          daily_fat_target: number | null
          daily_protein_target: number | null
          gender: string | null
          goal: string | null
          height: number | null
          id: string
          name: string | null
          onboarding_completed: boolean | null
          profile_photo_url: string | null
          state: string | null
          tdee: number | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          bmr?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          daily_calories_target?: number | null
          daily_carbs_target?: number | null
          daily_fat_target?: number | null
          daily_protein_target?: number | null
          gender?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          name?: string | null
          onboarding_completed?: boolean | null
          profile_photo_url?: string | null
          state?: string | null
          tdee?: number | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          bmr?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          daily_calories_target?: number | null
          daily_carbs_target?: number | null
          daily_fat_target?: number | null
          daily_protein_target?: number | null
          gender?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          name?: string | null
          onboarding_completed?: boolean | null
          profile_photo_url?: string | null
          state?: string | null
          tdee?: number | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          id: string
          logged_at: string
          user_id: string
          weight: number
        }
        Insert: {
          id?: string
          logged_at?: string
          user_id: string
          weight: number
        }
        Update: {
          id?: string
          logged_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          calories_burned: number
          duration_minutes: number
          exercise_id: string | null
          exercise_name: string
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          calories_burned: number
          duration_minutes: number
          exercise_id?: string | null
          exercise_name: string
          id?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          calories_burned?: number
          duration_minutes?: number
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { user1: string; user2: string }; Returns: boolean }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
