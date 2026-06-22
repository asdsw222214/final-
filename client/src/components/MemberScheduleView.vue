<template>
  <div class="flex-1 p-4 lg:p-6 max-w-4xl w-full mx-auto flex flex-col gap-5">
    <!-- Welcome banner -->
    <div class="glass-panel flex flex-col gap-1 relative">
      <div class="absolute top-4 right-4 flex gap-2 items-center">
        <button
          @click="$emit('view-group-overview')"
          class="btn btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
          title="查看小組總覽"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          返回總覽
        </button>
        <button
          @click="$emit('set-theme', theme === 'dark' ? 'light' : 'dark')"
          class="btn btn-secondary p-2.5 rounded-xl flex items-center justify-center"
          :title="theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'"
        >
          <Sun v-if="theme === 'dark'" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4 text-indigo-500" />
        </button>
      </div>
      <span class="text-xs text-gray-400">「{{ groupName }}」空堂媒合小組</span>
      <h1 class="text-xl md:text-2xl font-extrabold font-display flex items-center gap-2 pr-40">
        <UserCircle2 class="w-6 h-6 text-blue-400" />
        歡迎，{{ member.name }}！請填寫你的課表
      </h1>
      <p class="text-xs text-gray-400 mt-1 max-w-xl">
        這個連結只屬於你，填寫的內容會即時同步給小組其他人，不會被其他組員看到/修改你以外的資料。
      </p>
    </div>

    <!-- Name / color settings -->
    <div class="glass-panel flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold">我的基本資料</h2>
        <span class="text-[11px]">{{ getStatusLabel(infoStatus) }}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-gray-400 block mb-1 font-semibold">姓名／代稱</label>
          <input
            type="text"
            v-model="name"
            @input="handleNameInput"
            class="input-field py-1.5 px-3 w-full text-sm"
            placeholder="輸入你的姓名"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1 font-semibold">代表顏色</label>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="c in PRESET_COLORS"
              :key="c"
              type="button"
              @click="handleColorChange(c)"
              class="w-6 h-6 rounded-full border border-white/20 transition-all flex items-center justify-center cursor-pointer"
              :style="{
                backgroundColor: c,
                outline: color === c ? '2px solid white' : 'none',
                outlineOffset: '1px'
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Schedule editor -->
    <div class="glass-panel flex flex-col gap-3 flex-1">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 class="text-sm font-bold">我的課表 / 忙碌時段</h2>
        <div class="flex items-center gap-2">
          <span class="text-[11px]">{{ getStatusLabel(scheduleStatus) }}</span>
          <button
            @click="isImportModalOpen = true"
            class="btn btn-secondary py-1.5 px-3 text-xs"
          >
            <ClipboardPaste class="w-3.5 h-3.5" />
            智慧貼上課表
          </button>
          <button
            @click="handleClearAll"
            class="btn btn-danger py-1.5 px-3 text-xs"
          >
            <Trash2 class="w-3.5 h-3.5" />
            清空
          </button>
        </div>
      </div>

      <p class="text-xs text-gray-400 -mt-1">
        建議直接在下方網格手動點選或拖曳劃記，加退選後也可以隨時回來調整，最準確可靠。
      </p>

      <ScheduleEditorGrid
        :periods="periods"
        :busySlots="busySlots"
        :color="color"
        @change="saveSchedule"
        maxHeight="50vh"
      />
    </div>

    <!-- Link to overview -->
    <button
      @click="$emit('view-group-overview')"
      class="btn btn-secondary py-2.5 px-4 text-sm self-center flex items-center gap-1.5"
    >
      查看完整小組空堂總覽
      <ArrowRight class="w-3.5 h-3.5" />
    </button>

    <ImportModal
      :member="importTargetMember"
      :periods="periods"
      :isOpen="isImportModalOpen"
      @close="isImportModalOpen = false"
      @import="handleImported"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { CheckCircle2, Loader2, ClipboardPaste, Trash2, ArrowRight, UserCircle2, Sun, Moon, ArrowLeft } from 'lucide-vue-next';
import ScheduleEditorGrid from './ScheduleEditorGrid.vue';
import ImportModal from './ImportModal.vue';

const props = defineProps({
  groupId: {
    type: String,
    required: true
  },
  groupName: {
    type: String,
    required: true
  },
  member: {
    type: Object,
    required: true
  },
  periods: {
    type: Array,
    required: true
  },
  theme: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['set-theme', 'view-group-overview']);

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#ec4899', '#8b5cf6',
  '#f59e0b', '#06b6d4', '#f97316', '#f43f5e'
];

const name = ref(props.member.name);
const color = ref(props.member.color);
const busySlots = ref(props.member.busySlots || {});
const scheduleStatus = ref('idle');
const infoStatus = ref('idle');
const isImportModalOpen = ref(false);

let scheduleSaveTimer = null;
let infoSaveTimer = null;
const initializedMemberId = ref(null);

// Reset components states when member updates, unless it's the active editing member
watch(() => props.member, (newMember) => {
  if (initializedMemberId.value !== newMember.id) {
    name.value = newMember.name;
    color.value = newMember.color;
    busySlots.value = newMember.busySlots || {};
    initializedMemberId.value = newMember.id;
  }
}, { immediate: true });

onUnmounted(() => {
  if (scheduleSaveTimer) clearTimeout(scheduleSaveTimer);
  if (infoSaveTimer) clearTimeout(infoSaveTimer);
});

// Save schedule data (busySlots)
const saveSchedule = (nextSlots) => {
  busySlots.value = nextSlots;
  scheduleStatus.value = 'saving';
  if (scheduleSaveTimer) clearTimeout(scheduleSaveTimer);
  scheduleSaveTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/groups/${props.groupId}/members/${props.member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busySlots: nextSlots })
      });
      if (!res.ok) throw new Error('Save schedule failed');
      scheduleStatus.value = 'saved';
    } catch (err) {
      console.error(err);
      scheduleStatus.value = 'error';
    }
  }, 500);
};

// Save member info (name, color)
const saveInfo = (nextName, nextColor) => {
  infoStatus.value = 'saving';
  if (infoSaveTimer) clearTimeout(infoSaveTimer);
  infoSaveTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/groups/${props.groupId}/members/${props.member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName.trim() || '未命名成員',
          color: nextColor
        })
      });
      if (!res.ok) throw new Error('Save info failed');
      infoStatus.value = 'saved';
    } catch (err) {
      console.error(err);
      infoStatus.value = 'error';
    }
  }, 500);
};

const handleNameInput = () => {
  saveInfo(name.value, color.value);
};

const handleColorChange = (newColor) => {
  color.value = newColor;
  saveInfo(name.value, newColor);
};

const handleClearAll = () => {
  if (window.confirm('確定要清空你目前填寫的所有課表時段嗎？')) {
    saveSchedule({});
  }
};

const handleImported = (memberId, importedSlots) => {
  saveSchedule(importedSlots);
};

const getStatusLabel = (status) => {
  if (status === 'saving') return '儲存中…';
  if (status === 'saved') return '已同步';
  if (status === 'error') return '儲存失敗，請檢查網路連線';
  return '';
};

const importTargetMember = computed(() => {
  return {
    ...props.member,
    name: name.value,
    color: color.value,
    busySlots: busySlots.value
  };
});
</script>
