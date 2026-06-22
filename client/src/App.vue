<template>
  <!-- 1. Firebase/Server 尚未設定 Notice: 這裡直接進入 Landing Page 因為後端是本地啟動的，不需 Firebase 設定 Notice -->
  
  <!-- 2. 沒有指定小組 -> 首頁 -->
  <div v-if="!route.groupId" class="app-container">
    <LandingPage :theme="theme" @set-theme="setTheme" @navigate="navigate" />
  </div>

  <!-- 3. 載入中 -->
  <div v-else-if="isLoadingGroup && !groupData" class="app-container">
    <div class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3 text-gray-400">
        <Loader2 class="w-8 h-8 animate-spin text-blue-400" />
        <span class="text-sm">正在載入小組資料…</span>
      </div>
    </div>
  </div>

  <!-- 4. 連線錯誤 -->
  <div v-else-if="groupLoadError" class="app-container">
    <div class="flex-1 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md flex flex-col items-center text-center gap-3">
        <AlertCircle class="w-8 h-8 text-rose-400" />
        <p class="text-sm text-gray-300">{{ groupLoadError }}</p>
        <button @click="navigate()" class="btn btn-secondary py-2 px-4 text-xs">
          <ArrowLeft class="w-3.5 h-3.5" />
          返回首頁
        </button>
      </div>
    </div>
  </div>

  <!-- 5. 找不到小組 -->
  <div v-else-if="groupNotFound || !groupData" class="app-container">
    <div class="flex-1 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md flex flex-col items-center text-center gap-3">
        <AlertCircle class="w-8 h-8 text-amber-400" />
        <p class="text-sm text-gray-300">找不到此小組，連結可能有誤或小組已被刪除。</p>
        <button @click="navigate()" class="btn btn-secondary py-2 px-4 text-xs">
          <ArrowLeft class="w-3.5 h-3.5" />
          返回首頁
        </button>
      </div>
    </div>
  </div>

  <!-- 6. 指定了 member -> 個人填寫頁 -->
  <div v-else-if="route.memberId" class="app-container">
    <div v-if="!currentMember" class="flex-1 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md flex flex-col items-center text-center gap-3">
        <AlertCircle class="w-8 h-8 text-amber-400" />
        <p class="text-sm text-gray-300">找不到此成員，連結可能已失效。請向小組管理者確認連結是否正確。</p>
        <button @click="navigate(route.groupId)" class="btn btn-secondary py-2 px-4 text-xs">
          查看小組總覽
        </button>
      </div>
    </div>
    <MemberScheduleView
      v-else
      :groupId="route.groupId"
      :groupName="groupData.name"
      :member="currentMember"
      :periods="groupData.periods"
      :theme="theme"
      @set-theme="setTheme"
      @view-group-overview="navigate(route.groupId)"
    />
  </div>

  <!-- 7. 小組總覽 / 管理頁 -->
  <div v-else class="app-container">
    <AdminDashboard
      :groupId="route.groupId"
      :groupName="groupData.name"
      :periods="groupData.periods"
      :excludeWeekends="groupData.excludeWeekends"
      :members="groupData.members"
      :theme="theme"
      @set-theme="setTheme"
      @leave-group="navigate()"
      @refresh="fetchGroupData(false)"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-vue-next';
import LandingPage from './components/LandingPage.vue';
import AdminDashboard from './components/AdminDashboard.vue';
import MemberScheduleView from './components/MemberScheduleView.vue';

const LS_THEME_KEY = 'freeTimeMatcher_theme';

const theme = ref(localStorage.getItem(LS_THEME_KEY) || 'dark');
const route = reactive({
  groupId: null,
  memberId: null
});

const groupData = ref(null);
const isLoadingGroup = ref(false);
const groupLoadError = ref(null);
const groupNotFound = ref(false);
let pollingInterval = null;

// Parse routes from search query
const parseRoute = () => {
  const params = new URLSearchParams(window.location.search);
  route.groupId = params.get('group');
  route.memberId = params.get('member');
};

const buildUrl = (groupId, memberId) => {
  const params = new URLSearchParams();
  if (groupId) params.set('group', groupId);
  if (memberId) params.set('member', memberId);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
};

const navigate = (groupId, memberId) => {
  const url = buildUrl(groupId, memberId);
  window.history.pushState({}, '', url);
  route.groupId = groupId || null;
  route.memberId = memberId || null;
};

const currentMember = computed(() => {
  if (!groupData.value || !route.memberId) return null;
  return groupData.value.members.find(m => m.id === route.memberId) || null;
});

const setTheme = (newTheme) => {
  theme.value = newTheme;
  document.documentElement.className = newTheme;
  localStorage.setItem(LS_THEME_KEY, newTheme);
};

// Fetch group data from Express backend
const fetchGroupData = async (showLoading = false) => {
  if (!route.groupId) return;
  if (showLoading) {
    isLoadingGroup.value = true;
  }
  try {
    const res = await fetch(`/api/groups/${route.groupId}`);
    if (res.status === 404) {
      groupNotFound.value = true;
      groupData.value = null;
    } else if (!res.ok) {
      throw new Error('Network response was not ok');
    } else {
      const data = await res.json();
      groupNotFound.value = false;
      groupLoadError.value = null;
      groupData.value = data;
      saveToRecentGroups(data.id, data.name);
    }
  } catch (err) {
    console.error(err);
    // Don't override existing data with error unless there is no data at all
    if (!groupData.value) {
      groupLoadError.value = '讀取小組資料失敗，請確認網路連線或伺服器是否正常運作。';
    }
  } finally {
    isLoadingGroup.value = false;
  }
};

const saveToRecentGroups = (id, name) => {
  try {
    const listStr = localStorage.getItem('recent_groups') || '[]';
    let list = JSON.parse(listStr);
    list = list.filter(item => item.id !== id);
    list.unshift({ id, name, visitedAt: Date.now() });
    list = list.slice(0, 5);
    localStorage.setItem('recent_groups', JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save to recent groups:', e);
  }
};

// Setup state listeners and polling
const handlePopState = () => parseRoute();

onMounted(() => {
  document.documentElement.className = theme.value;
  parseRoute();
  window.addEventListener('popstate', handlePopState);

  // Watch groupId to trigger initial fetch and polling
  watch(() => route.groupId, (newGroupId) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }

    if (newGroupId) {
      fetchGroupData(true);
      // Poll database every 5 seconds to keep data synchronized
      pollingInterval = setInterval(() => {
        fetchGroupData(false);
      }, 5000);
    } else {
      groupData.value = null;
      groupNotFound.value = false;
      groupLoadError.value = null;
    }
  }, { immediate: true });
});

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState);
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});
</script>
