<template>
  <div class="flex-1 flex items-center justify-center p-4 lg:p-6 relative">
    <!-- Theme Toggle -->
    <button
      @click="$emit('set-theme', theme === 'dark' ? 'light' : 'dark')"
      class="btn btn-secondary p-2.5 rounded-xl absolute top-4 right-4 lg:top-6 lg:right-6"
      :title="theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'"
    >
      <Sun v-if="theme === 'dark'" class="w-4 h-4 text-amber-400" />
      <Moon v-else class="w-4 h-4 text-indigo-500" />
    </button>

    <div class="w-full max-w-2xl flex flex-col gap-6 animate-fade-in">
      <!-- Hero -->
      <div class="text-center flex flex-col items-center gap-3">
        <div class="bg-gradient-to-tr from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center">
          <Calendar class="w-9 h-9 text-white" />
        </div>
        <h1 class="text-2xl md:text-3xl font-extrabold font-display">課表空堂媒合器</h1>
        <p class="text-sm text-gray-400 max-w-md">
          每位組員透過專屬連結各自填寫自己的課表，系統即時同步並自動找出大家的共同空檔。
        </p>
      </div>

      <!-- Create Group -->
      <form @submit.prevent="handleCreate" class="glass-panel flex flex-col gap-3">
        <h2 class="text-base font-bold flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-amber-400" />
          建立新的空堂媒合小組
        </h2>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            v-model="groupName"
            placeholder="例如：期末專題小組、軟工課小組討論"
            class="input-field py-2.5 px-4 flex-1 text-sm"
          />
          <button
            type="submit"
            :disabled="!groupName.trim() || isCreating"
            class="btn btn-primary py-2.5 px-5 text-sm whitespace-nowrap disabled:opacity-50"
          >
            <Loader2 v-if="isCreating" class="w-4 h-4 animate-spin" />
            <ArrowRight v-else class="w-4 h-4" />
            建立小組
          </button>
        </div>
        <p v-if="createError" class="text-xs text-rose-400">{{ createError }}</p>
      </form>

      <!-- Join Group -->
      <form @submit.prevent="handleJoin" class="glass-panel flex flex-col gap-3">
        <h2 class="text-base font-bold flex items-center gap-2">
          <Users class="w-4 h-4 text-blue-400" />
          已經有小組了？貼上連結或代碼加入
        </h2>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            v-model="joinInput"
            placeholder="貼上組長分享的連結，或輸入小組代碼"
            class="input-field py-2.5 px-4 flex-1 text-sm font-mono"
          />
          <button
            type="submit"
            :disabled="!joinInput.trim() || isJoining"
            class="btn btn-secondary py-2.5 px-5 text-sm whitespace-nowrap disabled:opacity-50"
          >
            <Loader2 v-if="isJoining" class="w-4 h-4 animate-spin" />
            <ArrowRight v-else class="w-4 h-4" />
            前往小組
          </button>
        </div>
        <p v-if="joinError" class="text-xs text-rose-400">{{ joinError }}</p>
      </form>

      <!-- Recent Groups History -->
      <div v-if="recentGroups.length > 0" class="glass-panel flex flex-col gap-3">
        <h2 class="text-base font-bold flex items-center gap-2">
          <History class="w-4 h-4 text-emerald-400" />
          最近訪問的小組
        </h2>
        <div class="flex flex-col gap-2">
          <div
            v-for="group in recentGroups"
            :key="group.id"
            class="recent-group-item flex items-center justify-between p-2.5 rounded-xl animate-fade-in"
          >
            <button
              @click="$emit('navigate', group.id)"
              class="flex-1 text-left text-sm font-semibold truncate hover:text-blue-400 cursor-pointer"
            >
              {{ group.name }}
            </button>
            <button
              @click="removeRecentGroup(group.id)"
              class="recent-group-remove-btn"
              title="清除記錄"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Calendar, Users, Sparkles, ArrowRight, Loader2, Sun, Moon, History, X } from 'lucide-vue-next';

defineProps({
  theme: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['set-theme', 'navigate']);

const groupName = ref('');
const isCreating = ref(false);
const createError = ref('');

const joinInput = ref('');
const isJoining = ref(false);
const joinError = ref('');

const recentGroups = ref([]);

const loadRecentGroups = () => {
  try {
    const listStr = localStorage.getItem('recent_groups') || '[]';
    recentGroups.value = JSON.parse(listStr);
  } catch (e) {
    console.error('Failed to load recent groups:', e);
  }
};

const removeRecentGroup = (id) => {
  try {
    recentGroups.value = recentGroups.value.filter(g => g.id !== id);
    localStorage.setItem('recent_groups', JSON.stringify(recentGroups.value));
  } catch (e) {
    console.error('Failed to remove recent group:', e);
  }
};

onMounted(() => {
  loadRecentGroups();
});

/** 從使用者貼上的內容（可能是完整連結，也可能只是代碼）解析出 group / member 代碼 */
const parseGroupInput = (input) => {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  try {
    const url = new URL(trimmed, window.location.origin);
    const groupId = url.searchParams.get('group');
    const memberId = url.searchParams.get('member');
    if (groupId) {
      return { groupId, memberId: memberId || undefined };
    }
  } catch {
    // Ignore URL parse error and fall through
  }

  const groupMatch = trimmed.match(/group=([a-z0-9]+)/i);
  if (groupMatch) {
    const memberMatch = trimmed.match(/member=([a-z0-9]+)/i);
    return { groupId: groupMatch[1], memberId: memberMatch ? memberMatch[1] : undefined };
  }

  if (/^[a-z0-9]{4,}$/i.test(trimmed)) {
    return { groupId: trimmed };
  }

  return null;
};

const handleCreate = async () => {
  if (!groupName.value.trim() || isCreating.value) return;
  isCreating.value = true;
  createError.value = '';
  try {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: groupName.value.trim() })
    });
    if (!res.ok) throw new Error('Create group failed');
    const data = await res.json();
    emit('navigate', data.id);
  } catch (err) {
    console.error(err);
    createError.value = '建立小組失敗，請確認伺服器連線是否正常，或稍後再試一次。';
  } finally {
    isCreating.value = false;
  }
};

const handleJoin = async () => {
  if (!joinInput.value.trim() || isJoining.value) return;
  const parsed = parseGroupInput(joinInput.value);
  if (!parsed) {
    joinError.value = '無法辨識輸入內容，請貼上完整的小組連結或代碼。';
    return;
  }
  isJoining.value = true;
  joinError.value = '';
  try {
    const res = await fetch(`/api/groups/${parsed.groupId}/exists`);
    if (!res.ok) throw new Error('Check group exists failed');
    const { exists } = await res.json();
    if (!exists) {
      joinError.value = '找不到此小組，請確認代碼或連結是否正確。';
      return;
    }
    emit('navigate', parsed.groupId, parsed.memberId);
  } catch (err) {
    console.error(err);
    joinError.value = '查詢小組失敗，請確認網路連線或伺服器設定。';
  } finally {
    isJoining.value = false;
  }
};
</script>
