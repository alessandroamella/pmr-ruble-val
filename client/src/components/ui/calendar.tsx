'use client';

import { endOfDay, getMonth, getYear } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Import the CSS for react-datepicker. You can do this here or in a global CSS file.
// If you do it globally (e.g., in your layout.tsx or App.tsx), you can remove this line.
import 'react-datepicker/dist/react-datepicker.css';
import { useMemo } from 'react';

const STARTING_YEAR = 2005; // Data published since 2005

// Define the custom props for our new Calendar component
export type CalendarProps = {
  className?: string;
  selected?: Date | null;
  onSelect: (date: Date | null) => void;
  disabled?: (date: Date) => boolean;
  // Add any other props from react-datepicker you want to expose
  // e.g., minDate, maxDate, etc.
  [key: string]: any;
};

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  ...props
}: CalendarProps) {
  // Helper function to generate a range of years for the dropdown
  const yearRange = useMemo(() => {
    const currentYear = getYear(new Date());
    const years = [];
    for (let i = STARTING_YEAR; i <= currentYear; i++) {
      years.push(i);
    }
    return years;
  }, []);

  return (
    <>
      {/* 
        This is a bit of a hack to style react-datepicker with Tailwind.
        We apply global styles scoped to the custom class 'shadcn-datepicker'.
      */}
      <style>{`
        .shadcn-datepicker .react-datepicker {
          border: none;
          background-color: transparent;
        }
        .shadcn-datepicker .react-datepicker__header {
          background-color: transparent;
          border-bottom: none;
          padding: 0;
          margin-bottom: 0.5rem; /* Equivalent to mb-2 */
        }
        .shadcn-datepicker .react-datepicker__day-names {
          margin-bottom: 0.5rem; /* Equivalent to mb-2 */
        }
        .shadcn-datepicker .react-datepicker__day-name {
          color: hsl(var(--muted-foreground));
          font-size: 0.8rem;
          line-height: 1rem;
          width: 2.25rem; /* Equivalent to w-9 */
        }
        .shadcn-datepicker .react-datepicker__day {
          width: 2.25rem; /* Equivalent to w-9 */
          height: 2.25rem; /* Equivalent to h-9 */
          line-height: 2.25rem;
          border-radius: 0.5rem; /* Equivalent to rounded-md */
          font-weight: 400; /* Equivalent to font-normal */
          color: hsl(var(--foreground));
        }
        .shadcn-datepicker .react-datepicker__day:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
        .shadcn-datepicker .react-datepicker__day--selected {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .shadcn-datepicker .react-datepicker__day--selected:hover {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .shadcn-datepicker .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }
        .shadcn-datepicker .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }
        .shadcn-datepicker .react-datepicker__day--disabled:hover {
          background-color: transparent;
        }
        .shadcn-datepicker .react-datepicker__day--keyboard-selected {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
      `}</style>
      <DatePicker
        // Main props
        selected={selected}
        onChange={onSelect}
        filterDate={disabled}
        minDate={new Date(STARTING_YEAR, 0, 1)}
        maxDate={endOfDay(new Date())}
        inline // Render the calendar directly
        // Add our custom class for styling
        calendarClassName={cn('p-3', className)}
        wrapperClassName="shadcn-datepicker"
        // Custom Header for Year/Month dropdowns and navigation
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => {
          return (
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'icon' }),
                  'h-7 w-7',
                )}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={months[getMonth(date)]}
                  onChange={({ target: { value } }) =>
                    changeMonth(months.indexOf(value))
                  }
                  className="bg-transparent text-sm font-medium border-none focus:ring-0 cursor-pointer"
                >
                  {months.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  value={getYear(date)}
                  onChange={({ target: { value } }) =>
                    changeYear(Number(value))
                  }
                  className="bg-transparent text-sm font-medium border-none focus:ring-0 cursor-pointer"
                >
                  {yearRange.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'icon' }),
                  'h-7 w-7',
                )}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        }}
        {...props}
      />
    </>
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
