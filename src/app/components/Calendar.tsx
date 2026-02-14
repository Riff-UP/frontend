'use client';

interface CalendarProps {
  currentMonth: number;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  hasEventOnDate?: (day: number) => boolean;
}

export default function Calendar({
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  onMonthChange,
  onYearChange,
  hasEventOnDate
}: CalendarProps) {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Previous month days
    const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="text-center py-2 text-white/30 text-sm">
          {prevMonthDays - i}
        </div>
      );
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
      const hasEvent = hasEventOnDate ? hasEventOnDate(day) : false;
      
      days.push(
        <div
          key={day}
          className={`text-center py-2 text-sm cursor-pointer rounded-sm transition-colors relative ${
            isToday
              ? 'bg-riff-primary text-white font-semibold'
              : 'text-white hover:bg-riff-primary/20'
          }`}
        >
          {day}
          {hasEvent && !isToday && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-riff-primary rounded-full"></div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-riff-header border border-white/10 rounded-sm p-4">
      {/* Month/Year selector */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="text-white hover:text-riff-primary transition-colors p-2"
        >
          ‹
        </button>
        <div className="flex gap-2">
          <select
            value={months[currentMonth]}
            onChange={(e) => onMonthChange(months.indexOf(e.target.value))}
            className="px-3 py-1.5 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white text-sm focus:outline-none focus:ring-2 focus:ring-riff-primary"
          >
            {months.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <select
            value={currentYear}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-riff-text-secondary/40 border border-white/10 rounded-sm text-white text-sm focus:outline-none focus:ring-2 focus:ring-riff-primary"
          >
            {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onNextMonth}
          className="text-white hover:text-riff-primary transition-colors p-2"
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center text-white/60 text-xs font-medium py-2">
            {day}
          </div>
        ))}
        {renderCalendar()}
      </div>
    </div>
  );
}
