import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Flame } from "lucide-react";

interface ProfileHeaderProps {
  profile: {
    name: string;
    profile_photo_url?: string;
    daily_calories_target?: number;
  };
  onSignOut: () => void;
}

export const ProfileHeader = ({ profile, onSignOut }: ProfileHeaderProps) => {
  const navigate = useNavigate();
  
  const initials = profile.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-12 w-12 rounded-full p-0">
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarImage src={profile.profile_photo_url} alt={profile.name} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile.name}</p>
            {profile.daily_calories_target && (
              <p className="text-xs leading-none text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3" />
                {profile.daily_calories_target.toLocaleString()} kcal/day target
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Edit Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
