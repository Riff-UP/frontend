interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function TabNavigation({ tabs, activeTab, onTabChange, className = '' }: TabNavigationProps) {
  return (
    <div className={`flex border-b border-white/10 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 relative whitespace-nowrap ${
            activeTab === tab.id
              ? 'text-riff-primary'
              : 'text-riff-text-secondary hover:text-white'
          }`}
        >
          <span>{tab.label}</span>
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-riff-primary"></div>
          )}
        </button>
      ))}
    </div>
  );
}
