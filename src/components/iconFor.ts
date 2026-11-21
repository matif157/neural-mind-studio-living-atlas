import {
  Activity, ArrowUpRight, BookOpen, Brain, CalendarDays, Circle, Compass, FileText, Gem,
  LayoutGrid, Heart, Lightbulb, Link2, LockKeyhole, MapPin, Orbit, Repeat, ShieldCheck,
  Sparkles, Star, Target, User, Users, type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  circle: Circle, heart: Heart, lightbulb: Lightbulb, repeat: Repeat, brain: Brain,
  compass: Compass, user: User, diamond: Gem, arrow: ArrowUpRight, grid: LayoutGrid,
  pulse: Activity, target: Target, star: Star, shield: ShieldCheck, users: Users,
  map: MapPin, check: Sparkles, book: BookOpen, orbit: Orbit,
  calendar: CalendarDays, link: Link2, file: FileText, lock: LockKeyhole,
};

export function iconFor(name: string | undefined): LucideIcon {
  return (name && MAP[name]) || Sparkles;
}
