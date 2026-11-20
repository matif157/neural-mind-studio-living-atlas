import {
  Activity, ArrowUpRight, BookOpen, Brain, Circle, Compass, Gem, LayoutGrid,
  Heart, Lightbulb, MapPin, Repeat, ShieldCheck, Sparkles, Star, Target, User, Users,
  type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  circle: Circle, heart: Heart, lightbulb: Lightbulb, repeat: Repeat, brain: Brain,
  compass: Compass, user: User, diamond: Gem, arrow: ArrowUpRight, grid: LayoutGrid,
  pulse: Activity, target: Target, star: Star, shield: ShieldCheck, users: Users,
  map: MapPin, check: Sparkles, book: BookOpen,
};

export function iconFor(name: string | undefined): LucideIcon {
  return (name && MAP[name]) || Sparkles;
}
