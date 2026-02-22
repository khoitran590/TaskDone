import { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { db } from './firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

const formatDateTime = (date) => {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const IMPORTANCE = {
  high: { label: 'High', color: '#e74c3c' },
  medium: { label: 'Medium', color: '#f1c40f' },
  low: { label: 'Low', color: '#2ecc71' },
};

function AddTaskScreen({
  form,
  setForm,
  showCreatedPicker,
  setShowCreatedPicker,
  showDeadlinePicker,
  setShowDeadlinePicker,
  onSave,
  onCancel,
  theme,
  themedStyles,
  styles,
  IMPORTANCE,
  formatDateTime,
  isEdit,
}) {
  return (
    <ScrollView
      style={[styles.addTaskScreen, themedStyles.container]}
      contentContainerStyle={styles.addTaskContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.addTaskHeader}>
        <Pressable onPress={onCancel} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.accent} />
        </Pressable>
        <Text style={[styles.addTaskTitle, { color: theme.text }]}>
          {isEdit ? 'Edit Task' : 'New Task'}
        </Text>
      </View>

      <Text style={[styles.addTaskLabel, themedStyles.subtitle]}>
        Task title
      </Text>
      <TextInput
        style={[styles.addTaskInput, themedStyles.input]}
        placeholder="Enter task title..."
        placeholderTextColor={theme.textMuted}
        value={form.title}
        onChangeText={(title) => setForm({ ...form, title })}
      />

      <Text style={[styles.addTaskLabel, themedStyles.subtitle]}>
        Importance
      </Text>
      <View style={styles.importanceRow}>
        {Object.entries(IMPORTANCE).map(([key, { label, color }]) => (
          <Pressable
            key={key}
            onPress={() => setForm({ ...form, importance: key })}
            style={[
              styles.importanceBtn,
              { backgroundColor: color },
              form.importance === key && styles.importanceBtnSelected,
            ]}
          >
            <Text
              style={[
                styles.importanceBtnText,
                themedStyles.importanceBtnText,
                form.importance === key && { color: '#fff' },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.addTaskLabel, themedStyles.subtitle]}>
        Date & time created
      </Text>
      <Pressable
        onPress={() => setShowCreatedPicker(true)}
        style={[styles.dateTimeBtn, themedStyles.header]}
      >
        <Ionicons name="calendar-outline" size={20} color={theme.accentSoft} />
        <Text style={[styles.dateTimeText, themedStyles.dateTimeText]}>
          {formatDateTime(form.createdAt)}
        </Text>
      </Pressable>
      {showCreatedPicker && (
        <DateTimePicker
          value={form.createdAt}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          textColor={theme.text}
          onChange={(_, date) => {
            setShowCreatedPicker(Platform.OS === 'ios');
            if (date) setForm({ ...form, createdAt: date });
          }}
        />
      )}

      <Text style={[styles.addTaskLabel, themedStyles.subtitle]}>
        Deadline
      </Text>
      <Pressable
        onPress={() => setShowDeadlinePicker(true)}
        style={[styles.dateTimeBtn, themedStyles.header]}
      >
        <Ionicons name="flag-outline" size={20} color={theme.accentSoft} />
        <Text style={[styles.dateTimeText, themedStyles.dateTimeText]}>
          {formatDateTime(form.deadline)}
        </Text>
      </Pressable>
      {showDeadlinePicker && (
        <DateTimePicker
          value={form.deadline}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          textColor={theme.text}
          onChange={(_, date) => {
            setShowDeadlinePicker(Platform.OS === 'ios');
            if (date) setForm({ ...form, deadline: date });
          }}
        />
      )}

      <View style={styles.addTaskActions}>
        <Pressable
          onPress={onCancel}
          style={[styles.addTaskCancelBtn, themedStyles.header]}
        >
          <Text style={[styles.addTaskCancelText, themedStyles.subtitle]}>
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          style={[styles.addTaskSaveBtn, !form.title.trim() && styles.addBtnDisabled]}
          disabled={!form.title.trim()}
        >
          <Text style={styles.addTaskSaveText}>
            {isEdit ? 'Update Task' : 'Save Task'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const themes = {
  dark: {
    bg: '#1a1a2e',
    card: '#16213e',
    text: '#fff',
    textMuted: '#95a5a6',
    accent: '#7BAFD4',
    accentSoft: '#A8D8EA',
  },
  light: {
    bg: '#f5f6fa',
    card: '#fff',
    text: '#2d3436',
    textMuted: '#636e72',
    accent: '#7BAFD4',
    accentSoft: '#89CFF0',
  },
};

const TASKS_COLLECTION = 'tasks';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [isDark, setIsDark] = useState(true);
  const [showAddTaskScreen, setShowAddTaskScreen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [addTaskForm, setAddTaskForm] = useState({
    title: '',
    importance: 'medium',
    createdAt: new Date(),
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  const [showCreatedPicker, setShowCreatedPicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const theme = themes[isDark ? 'dark' : 'light'];

  useEffect(() => {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const activeQuery = query(tasksRef, where('deleted', '==', false));
    const deletedQuery = query(tasksRef, where('deleted', '==', true));

    const unsubActive = onSnapshot(activeQuery, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTasks(data);
      setLoading(false);
    });

    const unsubDeleted = onSnapshot(deletedQuery, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDeletedTasks(data);
    });

    return () => {
      unsubActive();
      unsubDeleted();
    };
  }, []);

  const addTask = async () => {
    const trimmed = addTaskForm.title.trim();
    if (!trimmed) return;

    const taskData = {
      title: trimmed,
      done: false,
      importance: addTaskForm.importance,
      createdAt: addTaskForm.createdAt.toISOString(),
      deadline: addTaskForm.deadline.toISOString(),
      deleted: false,
    };

    try {
      if (editingTaskId) {
        await setDoc(doc(db, TASKS_COLLECTION, editingTaskId), {
          ...taskData,
          done: tasks.find((t) => t.id === editingTaskId)?.done ?? false,
        }, { merge: true });
      } else {
        const id = Date.now().toString();
        await setDoc(doc(db, TASKS_COLLECTION, id), { ...taskData, id }, { merge: true });
      }
      resetAddTaskForm();
      setShowAddTaskScreen(false);
      setEditingTaskId(null);
    } catch (err) {
      console.error('Firebase add/update task error:', err);
    }
  };

  const startEditTask = (task) => {
    setEditingTaskId(task.id);
    setAddTaskForm({
      title: task.title,
      importance: task.importance || 'medium',
      createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
      deadline: task.deadline ? new Date(task.deadline) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    setShowAddTaskScreen(true);
  };

  const resetAddTaskForm = () => {
    setAddTaskForm({
      title: '',
      importance: 'medium',
      createdAt: new Date(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  };

  const cancelAddTask = () => {
    resetAddTaskForm();
    setShowAddTaskScreen(false);
    setEditingTaskId(null);
  };

  const toggleDone = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      await setDoc(doc(db, TASKS_COLLECTION, id), { done: !task.done }, { merge: true });
    } catch (err) {
      console.error('Firebase toggle done error:', err);
    }
  };

  const removeTask = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      await setDoc(doc(db, TASKS_COLLECTION, id), {
        deleted: true,
        deletedAt: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.error('Firebase remove task error:', err);
    }
  };

  const restoreTask = async (task) => {
    const { deletedAt, deleted, ...restoredTask } = task;
    try {
      await setDoc(doc(db, TASKS_COLLECTION, task.id), {
        ...restoredTask,
        deleted: false,
      }, { merge: true });
    } catch (err) {
      console.error('Firebase restore task error:', err);
    }
  };

  const permanentlyRemoveTask = async (id) => {
    try {
      await deleteDoc(doc(db, TASKS_COLLECTION, id));
    } catch (err) {
      console.error('Firebase permanent delete error:', err);
    }
  };

  const renderTask = ({ item }) => {
    const importance = item.importance || 'medium';
    const importanceColor = IMPORTANCE[importance]?.color || IMPORTANCE.medium.color;
    const createdStr = item.createdAt ? formatDateTime(new Date(item.createdAt)) : null;
    const deadlineStr = item.deadline ? formatDateTime(new Date(item.deadline)) : null;
    return (
    <View
      style={[
        styles.taskRow,
        { backgroundColor: theme.card, borderLeftColor: importanceColor },
        item.done && styles.taskRowDone,
      ]}
    >
      <Pressable
        onPress={() => toggleDone(item.id)}
        style={[
          styles.checkbox,
          { borderColor: theme.accentSoft },
          item.done && styles.checkboxDone,
        ]}
      >
        {item.done && <Ionicons name="checkmark" size={18} color="#fff" />}
      </Pressable>
      <View style={styles.taskContent}>
        <Text
          style={[
            styles.taskText,
            { color: theme.text },
            item.done && [styles.taskTextDone, { color: theme.textMuted }],
          ]}
        >
          {item.title}
        </Text>
        {(createdStr || deadlineStr) && (
          <View style={styles.taskMeta}>
            {createdStr && (
              <Text style={[styles.taskMetaText, { color: theme.textMuted }]}>
                Created: {createdStr}
              </Text>
            )}
            {deadlineStr && (
              <View style={[styles.deadlineBadge, { backgroundColor: `${theme.accent}30`, borderColor: theme.accent }]}>
                <Ionicons name="flag" size={12} color={theme.accent} />
                <Text style={[styles.deadlineBadgeText, { color: theme.accent }]}>
                  Due: {deadlineStr}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.taskActions}>
        <Pressable
          onPress={() => startEditTask(item)}
          style={styles.taskActionBtn}
          hitSlop={10}
        >
          <Ionicons name="pencil-outline" size={22} color={theme.accentSoft} />
        </Pressable>
        <Pressable
          onPress={() => removeTask(item.id)}
          style={styles.taskActionBtn}
          hitSlop={10}
        >
          <Ionicons name="trash-outline" size={22} color="#e74c3c" />
        </Pressable>
      </View>
    </View>
  );
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const themedStyles = useMemo(() => getThemedStyles(theme), [theme]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, themedStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, themedStyles.header]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, themedStyles.title]}>TaskDone</Text>
          <Pressable
            onPress={() => setIsDark(!isDark)}
            style={[styles.themeToggle, themedStyles.themeToggle]}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={24}
              color={theme.accent}
            />
          </Pressable>
        </View>
        <Text style={[styles.subtitle, themedStyles.subtitle]}>
          {activeTab === 'tasks'
            ? `${completedCount} of ${tasks.length} completed`
            : `${deletedTasks.length} deleted`}
        </Text>
        <View style={styles.tabBar}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'tasks' && [styles.tabActive, themedStyles.tabActive],
            ]}
            onPress={() => setActiveTab('tasks')}
          >
            <Ionicons
              name="list"
              size={20}
              color={activeTab === 'tasks' ? theme.accent : theme.accentSoft}
            />
            <Text
              style={[
                styles.tabText,
                themedStyles.tabText,
                activeTab === 'tasks' && themedStyles.tabTextActive,
              ]}
            >
              Tasks
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'deleted' && [styles.tabActive, themedStyles.tabActive],
            ]}
            onPress={() => setActiveTab('deleted')}
          >
            <Ionicons
              name="trash"
              size={20}
              color={activeTab === 'deleted' ? theme.accent : theme.accentSoft}
            />
            <Text
              style={[
                styles.tabText,
                themedStyles.tabText,
                activeTab === 'deleted' && themedStyles.tabTextActive,
              ]}
            >
              Deleted
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'tasks' && !showAddTaskScreen && (
        <View style={[styles.addBtnRow, themedStyles.header]}>
          <Pressable
            style={styles.addBtnLarge}
            onPress={() => {
              setEditingTaskId(null);
              resetAddTaskForm();
              setShowAddTaskScreen(true);
            }}
          >
            <Ionicons name="add" size={36} color="#fff" />
          </Pressable>
        </View>
      )}

      {showAddTaskScreen ? (
        <AddTaskScreen
          form={addTaskForm}
          setForm={setAddTaskForm}
          showCreatedPicker={showCreatedPicker}
          setShowCreatedPicker={setShowCreatedPicker}
          showDeadlinePicker={showDeadlinePicker}
          setShowDeadlinePicker={setShowDeadlinePicker}
          onSave={addTask}
          onCancel={cancelAddTask}
          theme={theme}
          themedStyles={themedStyles}
          styles={styles}
          IMPORTANCE={IMPORTANCE}
          formatDateTime={formatDateTime}
          isEdit={!!editingTaskId}
        />
      ) : activeTab === 'tasks' && loading ? (
        <View style={[styles.list, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.emptyText, themedStyles.emptyText]}>Loading tasks...</Text>
        </View>
      ) : activeTab === 'tasks' ? (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          style={[styles.list, themedStyles.list]}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, themedStyles.emptyText]}>
              No tasks yet. Add one above!
            </Text>
          }
        />
      ) : (
        <FlatList
          data={deletedTasks}
          renderItem={({ item }) => {
            const importance = item.importance || 'medium';
            const importanceColor = IMPORTANCE[importance]?.color || IMPORTANCE.medium.color;
            const deadlineStr = item.deadline ? formatDateTime(new Date(item.deadline)) : null;
            return (
            <View
              style={[
                styles.deletedRow,
                { backgroundColor: theme.card, borderLeftColor: importanceColor },
              ]}
            >
              <Ionicons name="trash-outline" size={22} color={theme.textMuted} />
              <View style={styles.taskContent}>
                <Text style={[styles.deletedText, { color: theme.textMuted }]}>
                  {item.title}
                </Text>
                {deadlineStr && (
                  <Text style={[styles.taskMetaText, { color: theme.textMuted }]}>
                    Was due: {deadlineStr}
                  </Text>
                )}
              </View>
              <View style={styles.taskActions}>
                <Pressable
                  onPress={() => restoreTask(item)}
                  style={styles.taskActionBtn}
                  hitSlop={10}
                >
                  <Ionicons name="arrow-undo-outline" size={22} color="#2ecc71" />
                </Pressable>
                <Pressable
                  onPress={() => permanentlyRemoveTask(item.id)}
                  style={styles.taskActionBtn}
                  hitSlop={10}
                >
                  <Ionicons name="trash" size={22} color="#e74c3c" />
                </Pressable>
              </View>
            </View>
          );
          }}
          keyExtractor={(item) => item.id}
          style={[styles.list, themedStyles.list]}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, themedStyles.emptyText]}>
              No deleted tasks yet.
            </Text>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

function getThemedStyles(theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg },
    header: { backgroundColor: theme.card },
    title: { color: theme.accent },
    subtitle: { color: theme.accentSoft },
    tabActive: { backgroundColor: `${theme.accent}33` },
    tabText: { color: theme.accentSoft },
    tabTextActive: { color: theme.accent },
    themeToggle: { backgroundColor: `${theme.accent}22` },
    input: { backgroundColor: theme.bg, color: theme.text },
    list: { backgroundColor: theme.bg },
    dateTimeText: { color: theme.text },
    importanceBtnText: { color: theme.text },
    emptyText: { color: theme.textMuted },
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#16213e',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#a2d2ff',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
  },
  tabText: {
    fontSize: 15,
    color: '#a2d2ff',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#7BAFD4',
  },
  addBtnRow: {
    padding: 16,
    alignItems: 'center',
  },
  addBtnLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7BAFD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTaskScreen: {
    flex: 1,
  },
  addTaskContent: {
    padding: 24,
    paddingBottom: 40,
  },
  addTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  backBtn: {
    padding: 4,
  },
  addTaskTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  addTaskLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  addTaskInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  dateTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  dateTimeText: {
    fontSize: 16,
  },
  addTaskActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  addTaskCancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addTaskCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addTaskSaveBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#7BAFD4',
    alignItems: 'center',
  },
  addTaskSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#16213e',
  },
  inputColumn: {
    flex: 1,
    gap: 10,
  },
  importanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  importanceLabel: {
    fontSize: 13,
  },
  importanceBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    opacity: 0.7,
  },
  importanceBtnSelected: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  importanceBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#7BAFD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#4a4a6a',
    opacity: 0.6,
  },
  list: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  taskRowDone: {
    opacity: 0.7,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#a2d2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#2ecc71',
    borderColor: '#2ecc71',
  },
  taskContent: {
    flex: 1,
    marginLeft: 14,
  },
  taskText: {
    fontSize: 16,
    color: '#fff',
  },
  taskMeta: {
    marginTop: 4,
  },
  taskMetaText: {
    fontSize: 12,
    marginTop: 2,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  deadlineBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskActionBtn: {
    padding: 4,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: '#95a5a6',
  },
  removeBtn: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c7a89',
    fontSize: 16,
    marginTop: 40,
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  deletedText: {
    fontSize: 16,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
});
