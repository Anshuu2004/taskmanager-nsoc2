import React from 'react';

export default function TaskToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  currentSort,
  onSortChange
}) {
  return (
    <div id="task-toolbar" className="task-toolbar" aria-label="Task search and sorting">
      <div className="search-box">
        <span className="search-icon" aria-hidden="true">&#128269;</span>
        <input
          id="task-search"
          type="search"
          placeholder="Search tasks..."
          aria-label="Search tasks"
          aria-keyshortcuts="/"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            id="search-clear"
            type="button"
            className="search-clear"
            aria-label="Clear search"
            onClick={onClearSearch}
          >
            &times;
          </button>
        )}
      </div>

      <div className="sort-box">
        <label htmlFor="task-sort" className="sort-label">Sort by:</label>
        <select
          id="task-sort"
          aria-label="Sort tasks"
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="default">Default</option>
          <option value="dueDate-asc">Due Date (Earliest)</option>
          <option value="dueDate-desc">Due Date (Latest)</option>
          <option value="priority-desc">Priority (High to Low)</option>
          <option value="priority-asc">Priority (Low to High)</option>
          <option value="alphabetical-asc">Title (A &rarr; Z)</option>
          <option value="alphabetical-desc">Title (Z &rarr; A)</option>
        </select>
      </div>
    </div>
  );
}
