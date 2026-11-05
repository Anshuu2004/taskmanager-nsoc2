import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TaskForm from './components/TaskForm';
import StatsDashboard from './components/StatsDashboard';
import TaskToolbar from './components/TaskToolbar';
import FilterTabs from './components/FilterTabs';
import TaskList from './components/TaskList';
import ChartsOverview from './components/ChartsOverview';
import BackupModal from './components/BackupModal';
import UndoToast from './components/UndoToast';
import BulkActionBar from './components/BulkActionBar';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { useTaskSelection } from './hooks/useTaskSelection';
import { useUndoDelete } from './hooks/useUndoDelete';
import { getTodayDate, createTaskId, getVisibleTasks } from './utils/taskUtils';
import { restoreEntry } from './utils/undoDelete';
import { applyBulkAction, getDeletedItems, getNewlyCompleted } from './utils/bulkActions';
import { loadEngineState, recordTaskCompletion, calcStreak, getBalance } from './utils/streakEngine';

export default function App() {
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  const [engine, setEngine] = useState(() => loadEngineState());
  const { isLight, toggleTheme } = useTheme();
  const undoDelete = useUndoDelete();

  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSort, setCurrentSort] = useState('default');
  const [, setLastRenderDate] = useState(getTodayDate());
  const visibleTasks = getVisibleTasks(tasks, currentFilter, searchQuery);
  const selection = useTaskSelection(visibleTasks);

  // Automatic overdue refresh when midnight passes or tab becomes visible
  useEffect(() => {
    const handleDateRefresh = () => {
      setLastRenderDate(prev => {
        const today = getTodayDate();
        if (today !== prev) {
          return today;
        }
        return prev;
      });
    };

    const interval = setInterval(handleDateRefresh, 60 * 1000);
    const handleVisibility = () => {
      if (!document.hidden) handleDateRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleAddTask = (newTask) => {
    setTasks(prev => [...prev, newTask]);
    if (!historyMode && currentFilter !== 'all') {
      setCurrentFilter('active');
    }
  };

  const handleToggleComplete = (taskToToggle) => {
    // Only a new completion counts. Un-completing does not take points back.
    if (!taskToToggle.completed) {
      setEngine(recordTaskCompletion(taskToToggle.id));
    }
    setTasks(prev =>
      prev.map(task => {
        if (task === taskToToggle) {
          const nextCompleted = !task.completed;
          return {
            ...task,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : null
          };
        }
        return task;
      })
    );
  };

  const handleDeleteTask = (taskToDelete) => {
    const index = tasks.indexOf(taskToDelete);
    if (index === -1) return;
    undoDelete.recordDelete(taskToDelete, index);
    setTasks(prev => prev.filter(task => task !== taskToDelete));
  };

  const handleUndoDelete = () => {
    const entry = undoDelete.undo();
    if (entry) setTasks(prev => restoreEntry(prev, entry));
  };

  // An import replaces the whole list, so saved positions no longer mean anything.
  // Imported records have no id yet, and selecting and moving tasks go by id.
  const handleTasksUpdate = (nextTasks) => {
    undoDelete.dismiss();
    setTasks(nextTasks.map(task => (task.id ? task : { ...task, id: createTaskId() })));
  };

  const handleUpdateTaskText = (taskToUpdate, newText) => {
    setTasks(prev =>
      prev.map(task =>
        task === taskToUpdate ? { ...task, text: newText } : task
      )
    );
  };

  const handleToggleHistory = () => {
    setHistoryMode(prev => !prev);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Runs one bulk action on what is ticked and on screen, then clears the ticks.
  const handleBulkAction = (action) => {
    const selectedIds = new Set(selection.selectedTasks.map(task => task.id));
    if (action.type === 'delete') {
      undoDelete.recordDeleteGroup(getDeletedItems(tasks, selectedIds));
    }
    if (action.type === 'complete') {
      // Same rule as completing one task: only a new completion counts.
      getNewlyCompleted(tasks, selectedIds).forEach(task => setEngine(recordTaskCompletion(task.id)));
    }
    setTasks(prev => applyBulkAction(prev, selectedIds, action));
    selection.clear();
  };

  return (
    <div className="app-shell">
      <Header
        isLight={isLight}
        onToggleTheme={toggleTheme}
        onOpenBackup={() => setIsBackupOpen(true)}
      />

      <TaskForm
        onAddTask={handleAddTask}
        historyMode={historyMode}
        onToggleHistory={handleToggleHistory}
      />

      <StatsDashboard
        tasks={tasks}
        streak={calcStreak(engine.activityDays)}
        points={getBalance(engine.ledger)}
        currentFilter={currentFilter}
        onSelectFilter={setCurrentFilter}
      />

      <TaskToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={handleClearSearch}
        currentSort={currentSort}
        onSortChange={setCurrentSort}
      />

      {historyMode && (
        <FilterTabs
          currentFilter={currentFilter}
          onSelectFilter={setCurrentFilter}
        />
      )}

      <BulkActionBar
        selectedTasks={selection.selectedTasks}
        visibleCount={visibleTasks.length}
        onSelectAll={selection.selectAll}
        onClear={selection.clear}
        onComplete={() => handleBulkAction({ type: 'complete' })}
        onSetPriority={(priority) => handleBulkAction({ type: 'priority', priority })}
        onDelete={() => handleBulkAction({ type: 'delete' })}
      />

      <TaskList
        tasks={tasks}
        currentFilter={currentFilter}
        searchQuery={searchQuery}
        currentSort={currentSort}
        selectedIds={selection.ids}
        onToggleSelect={selection.toggle}
        onToggleComplete={handleToggleComplete}
        onDeleteTask={handleDeleteTask}
        onUpdateTaskText={handleUpdateTaskText}
      />

      {historyMode && <ChartsOverview tasks={tasks} isLight={isLight} />}

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        tasks={tasks}
        onTasksUpdate={handleTasksUpdate}
      />

      <UndoToast
        message={undoDelete.message}
        count={undoDelete.count}
        onUndo={handleUndoDelete}
        onDismiss={undoDelete.dismiss}
        onPause={undoDelete.pause}
        onResume={undoDelete.resume}
      />
    </div>
  );
}
