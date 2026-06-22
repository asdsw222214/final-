<template>
  <div class="flex flex-col gap-3">
    <div v-if="showHint" class="text-xs text-gray-400 flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/10 p-2 rounded-lg">
      <Info class="w-4 h-4 text-blue-400 flex-shrink-0" />
      <span>
        <b>使用小技巧：</b>在課表網格上<b>點擊</b>切換有課／空堂，也可以<b>按住滑鼠拖曳</b>快速劃記多個時段！
      </span>
    </div>

    <div
      class="overflow-auto bg-slate-950/20 p-2.5 rounded-xl border border-white/5"
      :style="{ maxHeight }"
    >
      <div class="min-w-[650px]">
        <!-- Days Header -->
        <div class="grid grid-cols-[100px_repeat(7,1fr)] gap-1 mb-1.5 text-center font-bold text-xs text-gray-400">
          <div>節次</div>
          <div v-for="day in DAYS_ORDER" :key="day" class="py-1 bg-white/5 rounded-md">
            {{ DAY_LABELS[day] }}
          </div>
        </div>

        <!-- Grid Cells -->
        <div
          v-for="period in periods"
          :key="period.id"
          class="grid grid-cols-[100px_repeat(7,1fr)] gap-1 min-h-[44px]"
        >
          <div class="bg-white/5 border border-white/10 rounded-md p-1 flex flex-col items-center justify-center text-center">
            <span class="text-[11px] font-bold">{{ period.name }}</span>
            <span class="text-[8px] text-gray-400 mt-0.5">{{ period.startTime }}-{{ period.endTime }}</span>
          </div>

          <div
            v-for="day in DAYS_ORDER"
            :key="`${day}-${period.id}`"
            @mousedown="handleMouseDown(day, period.id)"
            @mouseenter="handleMouseEnter(day, period.id)"
            @mouseup="handleMouseUp"
            :style="getCellStyle(day, period.id)"
            class="border rounded-md p-1 flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all"
            :class="[
              isCellBusy(day, period.id) ? 'text-white font-semibold' : 'hover:bg-white/5',
              isCellSelected(day, period.id) ? 'ring-2 ring-amber-400 scale-95' : ''
            ]"
          >
            <div v-if="isCellBusy(day, period.id)" class="w-full h-full flex flex-col justify-between overflow-hidden">
              <span class="text-[9px] opacity-75 font-normal">有課</span>
              <span class="text-[10px] font-bold truncate max-w-full">
                {{ getCourseName(day, period.id) || '課堂' }}
              </span>
            </div>
            <span v-else class="text-[10px] text-gray-600 font-light">空堂</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modify course title panel -->
    <div v-if="selectedCell" class="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
      <div class="flex-1 flex items-center gap-3">
        <span class="text-xs text-gray-400 font-bold block whitespace-nowrap">
          修改選取時段的課程名稱：<br />
          <span class="text-amber-400">
            ({{ DAY_LABELS[selectedCell.day] }} {{ getPeriodName(selectedCell.periodId) }})
          </span>
        </span>
        <input
          type="text"
          v-model="courseText"
          @input="handleCourseTextChange"
          placeholder="例如：微積分、社團時間、工讀 (選填)"
          class="input-field py-1 px-3 text-xs flex-1"
          autoFocus
        />
      </div>
      <button
        @click="confirmSelection"
        class="btn btn-secondary py-1 px-2.5 text-[10px]"
      >
        確定
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Info } from 'lucide-vue-next';

const props = defineProps({
  periods: {
    type: Array,
    required: true
  },
  busySlots: {
    type: Object,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  maxHeight: {
    type: String,
    default: '42vh'
  },
  showHint: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['change']);

const DAYS_ORDER = ['M', 'T', 'W', 'TH', 'F', 'S', 'SU'];
const DAY_LABELS = {
  M: '週一',
  T: '週二',
  W: '週三',
  TH: '週四',
  F: '週五',
  S: '週六',
  SU: '週日'
};

const isMouseDown = ref(false);
const dragMode = ref(null);
const selectedCell = ref(null);
const courseText = ref('');

const isCellBusy = (day, periodId) => {
  return props.busySlots[day]?.[periodId] !== undefined;
};

const getCourseName = (day, periodId) => {
  return props.busySlots[day]?.[periodId] || '';
};

const getPeriodName = (periodId) => {
  const p = props.periods.find(x => x.id === periodId);
  return p ? p.name : '';
};

const isCellSelected = (day, periodId) => {
  return selectedCell.value?.day === day && selectedCell.value?.periodId === periodId;
};

const getCellStyle = (day, periodId) => {
  const busy = isCellBusy(day, periodId);
  const selected = isCellSelected(day, periodId);
  return {
    backgroundColor: busy ? props.color : 'transparent',
    borderColor: selected ? '#f59e0b' : (busy ? `${props.color}dd` : 'rgba(255,255,255,0.05)')
  };
};

const toggleCell = (day, periodId, forceMode) => {
  const updated = JSON.parse(JSON.stringify(props.busySlots));
  if (!updated[day]) {
    updated[day] = {};
  }

  const isCurrentlyBusy = updated[day][periodId] !== undefined;
  const targetMode = forceMode || (isCurrentlyBusy ? 'free' : 'busy');

  if (targetMode === 'free') {
    delete updated[day][periodId];
    if (Object.keys(updated[day]).length === 0) {
      delete updated[day];
    }
    if (selectedCell.value?.day === day && selectedCell.value?.periodId === periodId) {
      selectedCell.value = null;
      courseText.value = '';
    }
  } else {
    updated[day][periodId] = props.busySlots[day]?.[periodId] || '';
    selectedCell.value = { day, periodId };
    courseText.value = props.busySlots[day]?.[periodId] || '';
  }

  emit('change', updated);
};

const handleMouseDown = (day, periodId) => {
  isMouseDown.value = true;
  const mode = isCellBusy(day, periodId) ? 'free' : 'busy';
  dragMode.value = mode;
  toggleCell(day, periodId, mode);
};

const handleMouseEnter = (day, periodId) => {
  if (isMouseDown.value && dragMode.value) {
    toggleCell(day, periodId, dragMode.value);
  }
};

const handleMouseUp = () => {
  isMouseDown.value = false;
  dragMode.value = null;
};

const handleGlobalMouseUp = () => {
  isMouseDown.value = false;
  dragMode.value = null;
};

onMounted(() => {
  window.addEventListener('mouseup', handleGlobalMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', handleGlobalMouseUp);
});

const handleCourseTextChange = () => {
  if (selectedCell.value) {
    const { day, periodId } = selectedCell.value;
    if (props.busySlots[day]?.[periodId] !== undefined) {
      const updated = JSON.parse(JSON.stringify(props.busySlots));
      updated[day][periodId] = courseText.value;
      emit('change', updated);
    }
  }
};

const confirmSelection = () => {
  selectedCell.value = null;
  courseText.value = '';
};
</script>
