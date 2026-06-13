import { useMemo } from 'react';
import { Event } from '@/types/Event';
import { toLocalDateString } from '@/lib/dateFormat';
import { parseBorough } from '@/lib/borough';
import { matchesPriceFilter, type PriceFilter } from '@/lib/price';
import { matchesTimeOfDayFilter, type TimeOfDayFilter } from '@/lib/timeOfDay';

/**
 * Logic to filter events based on category, date range, borough, price, time, and saved status.
 */
export function useEventFiltering(
  events: Event[],
  selectedCategory: string,
  selectedDateRange: string,
  savedEventIds: string[],
  selectedBorough: string = 'all',
  selectedPrice: PriceFilter = 'all',
  selectedTimeOfDay: TimeOfDayFilter = 'all'
) {
  return useMemo(() => {
    let result = events;

    if (selectedCategory === 'saved') {
      const savedSet = new Set(savedEventIds);
      result = result.filter((event) => savedSet.has(event.id));
    } else if (selectedCategory !== 'all') {
      result = result.filter(
        (event) => event.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (selectedBorough !== 'all') {
      result = result.filter((event) => {
        const borough = event.borough || parseBorough(event.address);
        return borough === selectedBorough;
      });
    }

    if (selectedPrice !== 'all') {
      result = result.filter((event) => matchesPriceFilter(event.price, selectedPrice));
    }

    if (selectedTimeOfDay !== 'all') {
      result = result.filter((event) => matchesTimeOfDayFilter(event.time, selectedTimeOfDay));
    }

    if (selectedDateRange !== 'all') {
      const now = new Date();
      const todayIso = toLocalDateString(now);

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowIso = toLocalDateString(tomorrow);

      let weekendFriIso = '';
      let weekendSunIso = '';
      if (selectedDateRange === 'weekend') {
        const day = now.getDay();
        const fri = new Date(now);
        if (day === 0) {
          fri.setDate(now.getDate() - 2);
        } else if (day === 6) {
          fri.setDate(now.getDate() - 1);
        } else if (day !== 5) {
          const daysUntilFri = (5 - day + 7) % 7;
          fri.setDate(now.getDate() + daysUntilFri);
        }
        const sun = new Date(fri);
        sun.setDate(fri.getDate() + 2);
        weekendFriIso = toLocalDateString(fri);
        weekendSunIso = toLocalDateString(sun);
      }

      let weekEndIso = '';
      if (selectedDateRange === 'week') {
        const day = now.getDay();
        const daysUntilSunday = day === 0 ? 0 : 7 - day;
        const sunday = new Date(now);
        sunday.setDate(now.getDate() + daysUntilSunday);
        weekEndIso = toLocalDateString(sunday);
      }

      result = result.filter((event) => {
        if (!event.date) return false;
        const eDate = event.date.split('T')[0];

        if (selectedDateRange === 'today') return eDate === todayIso;
        if (selectedDateRange === 'tomorrow') return eDate === tomorrowIso;
        if (selectedDateRange === 'weekend') {
          const d = new Date(`${event.date}T00:00:00`);
          const day = d.getDay();
          if (!(day === 0 || day === 5 || day === 6)) return false;
          return eDate >= weekendFriIso && eDate <= weekendSunIso;
        }
        if (selectedDateRange === 'week') {
          return eDate >= todayIso && eDate <= weekEndIso;
        }
        return true;
      });
    }

    return result;
  }, [
    events,
    selectedCategory,
    selectedDateRange,
    savedEventIds,
    selectedBorough,
    selectedPrice,
    selectedTimeOfDay,
  ]);
}
