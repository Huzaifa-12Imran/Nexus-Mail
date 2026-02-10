// Energy level types and utilities
export type EnergyLevel = 1 | 2 | 3;
export type EnergyLabel = 'energized' | 'neutral' | 'drained';

export interface EnergyRating {
  id: string;
  user_id: string;
  email_id: string;
  energy_level: EnergyLevel;
  energy_icon: string;
  energy_label: EnergyLabel;
  subject: string;
  sender_email: string;
  sender_name: string;
  time_of_day: number;
  day_of_week: number;
  created_at: string;
}

export interface EnergyStats {
  total_ratings: number;
  energized_count: number;
  neutral_count: number;
  drained_count: number;
  energy_score: number; // -100 to 100
}

export interface EnergyPatterns {
  most_energizing_contacts: { email: string; name: string; count: number; avg_energy: number }[];
  most_draining_contacts: { email: string; name: string; count: number; avg_energy: number }[];
  peak_energy_hours: { hour: number; avg_energy: number; count: number }[];
  drain_hours: { hour: number; avg_energy: number; count: number }[];
  weekly_pattern: { day: number; label: string; avg_energy: number; count: number }[];
}

export interface SchedulingSuggestion {
  suggested_time: string;
  suggested_day: string;
  confidence: number;
  reason: string;
  emails_to_schedule: { email_id: string; subject: string; sender: string }[];
}

export const ENERGY_CONFIG = {
  1: { icon: '😮‍💨', label: 'Drained', color: 'text-red-500', bg: 'bg-red-100', score: -1 },
  2: { icon: '😐', label: 'Neutral', color: 'text-gray-500', bg: 'bg-gray-100', score: 0 },
  3: { icon: '⚡', label: 'Energized', color: 'text-green-500', bg: 'bg-green-100', score: 1 },
} as const;

export function getEnergyConfig(level: EnergyLevel) {
  return ENERGY_CONFIG[level];
}

export function calculateEnergyStats(ratings: EnergyRating[]): EnergyStats {
  const total = ratings.length;
  if (total === 0) {
    return { total_ratings: 0, energized_count: 0, neutral_count: 0, drained_count: 0, energy_score: 0 };
  }

  const energized = ratings.filter(r => r.energy_level === 3).length;
  const neutral = ratings.filter(r => r.energy_level === 2).length;
  const drained = ratings.filter(r => r.energy_level === 1).length;

  // Calculate energy score: (-100 to 100)
  const energyScore = Math.round(((energized - drained) / total) * 100);

  return {
    total_ratings: total,
    energized_count: energized,
    neutral_count: neutral,
    drained_count: drained,
    energy_score: energyScore,
  };
}

export function analyzePatterns(ratings: EnergyRating[]): EnergyPatterns {
  if (ratings.length === 0) {
    return {
      most_energizing_contacts: [],
      most_draining_contacts: [],
      peak_energy_hours: [],
      drain_hours: [],
      weekly_pattern: [],
    };
  }

  // Group by sender
  const senderGroups: Record<string, EnergyRating[]> = {};
  ratings.forEach(r => {
    const key = r.sender_email || 'unknown';
    if (!senderGroups[key]) senderGroups[key] = [];
    senderGroups[key].push(r);
  });

  // Calculate average energy per sender
  const senderStats = Object.entries(senderGroups).map(([email, rs]) => {
    const avgEnergy = rs.reduce((sum, r) => sum + r.energy_level, 0) / rs.length;
    const name = rs[0]?.sender_name || email;
    return { email, name, count: rs.length, avg_energy: avgEnergy };
  });

  // Sort by energy
  senderStats.sort((a, b) => b.avg_energy - a.avg_energy);

  const mostEnergizing = senderStats.filter(s => s.avg_energy >= 2.5).slice(0, 5);
  const mostDraining = senderStats.filter(s => s.avg_energy <= 1.5).reverse().slice(0, 5);

  // Hourly patterns
  const hourGroups: Record<number, EnergyRating[]> = {};
  for (let h = 0; h < 24; h++) hourGroups[h] = [];
  ratings.forEach(r => {
    if (hourGroups[r.time_of_day]) hourGroups[r.time_of_day].push(r);
  });

  const hourStats = Object.entries(hourGroups)
    .map(([hour, rs]) => ({
      hour: parseInt(hour),
      avg_energy: rs.length > 0 ? rs.reduce((sum, r) => sum + r.energy_level, 0) / rs.length : 0,
      count: rs.length,
    }))
    .filter(h => h.count > 0)
    .sort((a, b) => b.avg_energy - a.avg_energy);

  const peakEnergyHours = hourStats.slice(0, 5);
  const drainHours = hourStats.slice(-5).reverse();

  // Weekly patterns
  const dayGroups: Record<number, EnergyRating[]> = {};
  for (let d = 0; d < 7; d++) dayGroups[d] = [];
  ratings.forEach(r => {
    if (dayGroups[r.day_of_week]) dayGroups[r.day_of_week].push(r);
  });

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyPattern = Object.entries(dayGroups)
    .map(([day, rs]) => ({
      day: parseInt(day),
      label: dayLabels[parseInt(day)],
      avg_energy: rs.length > 0 ? rs.reduce((sum, r) => sum + r.energy_level, 0) / rs.length : 0,
      count: rs.length,
    }))
    .filter(d => d.count > 0);

  return {
    most_energizing_contacts: mostEnergizing,
    most_draining_contacts: mostDraining,
    peak_energy_hours: peakEnergyHours,
    drain_hours: drainHours,
    weekly_pattern: weeklyPattern,
  };
}

export async function generateAISuggestions(
  stats: EnergyStats,
  patterns: EnergyPatterns,
  recentRatings: EnergyRating[]
): Promise<SchedulingSuggestion[]> {
  // This would integrate with GPT-4o-mini for AI-powered suggestions
  // For now, we'll generate rule-based suggestions
  
  const suggestions: SchedulingSuggestion[] = [];

  // Suggest energizing activities during peak hours
  if (patterns.peak_energy_hours.length > 0) {
    const peakHour = patterns.peak_energy_hours[0];
    suggestions.push({
      suggested_time: `${peakHour.hour}:00`,
      suggested_day: 'weekday',
      confidence: peakHour.count > 3 ? 0.9 : 0.6,
      reason: `Your energy peaks around ${peakHour.hour}:00. Schedule important tasks and respond to energizing contacts during this time.`,
      emails_to_schedule: recentRatings
        .filter(r => r.energy_level === 3 && r.time_of_day !== peakHour.hour)
        .slice(0, 5)
        .map(r => ({ email_id: r.email_id, subject: r.subject || '', sender: r.sender_email })),
    });
  }

  // Suggest avoiding drain hours for important tasks
  if (patterns.drain_hours.length > 0 && patterns.drain_hours[0].avg_energy < 1.5) {
    const drainHour = patterns.drain_hours[0];
    suggestions.push({
      suggested_time: `${drainHour.hour}:00`,
      suggested_day: 'any',
      confidence: drainHour.count > 3 ? 0.85 : 0.5,
      reason: `Your energy tends to dip around ${drainHour.hour}:00. Use this time for lighter tasks or take breaks.`,
      emails_to_schedule: [],
    });
  }

  // Suggest scheduling draining contacts strategically
  if (patterns.most_draining_contacts.length > 0) {
    const topDrain = patterns.most_draining_contacts[0];
    const energizingHour = patterns.peak_energy_hours[0];
    if (energizingHour) {
      suggestions.push({
        suggested_time: `${energizingHour.hour}:00`,
        suggested_day: 'weekday',
        confidence: 0.7,
        reason: `Schedule responses to ${topDrain.name || topDrain.email} during your peak energy hours (${energizingHour.hour}:00) to minimize drain.`,
        emails_to_schedule: recentRatings
          .filter(r => r.sender_email === topDrain.email && r.energy_level === 1)
          .slice(0, 3)
          .map(r => ({ email_id: r.email_id, subject: r.subject || '', sender: r.sender_email })),
      });
    }
  }

  return suggestions;
}

export function getWeeklyRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
