<template>
  <div class="glass-panel flex-1 flex flex-col gap-4 overflow-hidden">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <h2 class="text-lg font-bold flex items-center gap-2">
        空堂媒合熱力圖
        <span v-if="totalActive === 0" class="text-xs text-rose-400 animate-pulse font-normal">
          (請在左側勾選要納入媒合的組員)
        </span>
      </h2>
      <div class="flex items-center gap-2">
        <button
          @click="$emit('open-period-settings')"
          class="btn btn-secondary py-1.5 px-3 text-xs"
        >
          <Settings2 class="w-3.5 h-3.5" />
          自訂節次時間
        </button>
        <button
          @click="$emit('export-png')"
          :disabled="totalActive === 0"
          class="btn btn-primary py-1.5 px-3 text-xs disabled:opacity-50"
        >
          <Image class="w-3.5 h-3.5" />
          匯出 PNG 圖片
        </button>
      </div>
    </div>

    <!-- Main Grid Wrapper -->
    <div class="flex-1 overflow-auto relative">
      <div 
        id="empty-slots-schedule-grid"
        class="min-w-[650px] p-2 bg-slate-950/20 rounded-xl"
      >
        <!-- Header Row -->
        <div class="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5 mb-1.5 text-center font-bold">
          <div class="flex items-center justify-center text-xs text-gray-400">節次 / 時間</div>
          <div 
            v-for="day in visibleDays" 
            :key="day" 
            class="py-2 bg-white/5 border border-white/10 rounded-lg text-sm flex flex-col items-center justify-center font-display"
          >
            <span>{{ DAY_LABELS[day] }}</span>
            <span class="text-[10px] text-gray-400 mt-0.5">{{ day }}</span>
          </div>
        </div>

        <!-- Period Rows -->
        <div 
          v-for="period in periods" 
          :key="period.id" 
          class="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5 min-h-[58px]"
        >
          <!-- Y-axis cell -->
          <div class="bg-white/5 border border-white/10 rounded-lg p-1.5 flex flex-col items-center justify-center text-center">
            <span class="text-xs font-bold font-display">{{ period.name }}</span>
            <span class="text-[9px] text-gray-400 mt-0.5">{{ period.startTime }}</span>
            <span class="text-[9px] text-gray-400">{{ period.endTime }}</span>
          </div>

          <!-- Day cells -->
          <div
            v-for="day in visibleDays"
            :key="`${day}-${period.id}`"
            @click="selectCell(day, period.id)"
            class="heatmap-cell border rounded-lg p-1.5 flex flex-col items-center justify-between text-center transition-all"
            :class="[
              getCellClass(day, period.id),
              isHighlighted(day, period.id) ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-98 shadow-amber-400/30 shadow-md' : ''
            ]"
            :style="getCellStyle(day, period.id)"
          >
            <!-- Free/Total counts -->
            <div v-if="totalActive > 0" class="flex flex-col items-center justify-center h-full w-full">
              <span class="text-sm font-bold tracking-tight">
                {{ getCellStats(day, period.id).free.length }} / {{ totalActive }}
              </span>
              <span class="text-[9px] opacity-75 mt-0.5">
                {{ getCellStats(day, period.id).free.length === totalActive ? '全員空堂' : `${getCellStats(day, period.id).free.length} 人有空` }}
              </span>
            </div>
            <div v-else class="text-[10px] text-gray-500 my-auto">-</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Cell details display -->
    <div v-if="selectedCell" class="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in">
      <div>
        <h3 class="text-sm font-bold flex items-center gap-1.5 text-blue-400">
          <Eye class="w-4 h-4" />
          時段詳情：{{ DAY_LABELS[selectedCell.day] }} {{ getPeriodName(selectedCell.periodId) }} ({{
            getPeriodTime(selectedCell.periodId)
          }})
        </h3>
        
        <!-- Attendees detail -->
        <div class="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          <div>
            <span class="text-xs text-gray-400 block mb-1">有空 ({{ selectedCellStats.free.length }}人)：</span>
            <div class="flex flex-wrap gap-1.5">
              <span v-if="selectedCellStats.free.length === 0" class="text-xs text-gray-500">無</span>
              <span v-else v-for="m in selectedCellStats.free" :key="m.id" class="badge badge-success text-[11px] py-0.5" :style="{ backgroundColor: `${m.color}20`, color: m.color }">
                {{ m.name }}
              </span>
            </div>
          </div>

          <div>
            <span class="text-xs text-gray-400 block mb-1">有課/忙碌 ({{ selectedCellStats.busy.length }}人)：</span>
            <div class="flex flex-wrap gap-1.5">
              <span v-if="selectedCellStats.busy.length === 0" class="text-xs text-gray-500">無</span>
              <span v-else v-for="item in selectedCellStats.busy" :key="item.member.id" class="badge badge-secondary text-[11px] py-0.5" :title="item.reason">
                {{ item.member.name }} ({{ item.reason }})
              </span>
            </div>
          </div>
        </div>
      </div>
      <button 
        @click="selectedCell = null"
        class="text-xs text-gray-400 hover:text-white underline cursor-pointer"
      >
        關閉面板
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Image, Eye, Settings2 } from 'lucide-vue-next';

const props = defineProps({
  members: {
    type: Array,
    required: true
  },
  periods: {
    type: Array,
    required: true
  },
  excludeWeekends: {
    type: Boolean,
    required: true
  },
  highlightedSlots: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['open-period-settings', 'export-png', 'cell-click']);

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

const selectedCell = ref(null);

const activeMembers = computed(() => props.members.filter(m => m.isActive));
const totalActive = computed(() => activeMembers.value.length);

const visibleDays = computed(() => {
  return props.excludeWeekends
    ? DAYS_ORDER.filter(d => d !== 'S' && d !== 'SU')
    : DAYS_ORDER;
});

const getPeriodName = (periodId) => {
  const p = props.periods.find(x => x.id === periodId);
  return p ? p.name : '';
};

const getPeriodTime = (periodId) => {
  const p = props.periods.find(x => x.id === periodId);
  return p ? `${p.startTime} - ${p.endTime}` : '';
};

const getCellStats = (day, periodId) => {
  const busy = [];
  const free = [];

  activeMembers.value.forEach(member => {
    const reason = member.busySlots[day]?.[periodId];
    if (reason !== undefined) {
      busy.push({ member, reason: reason || '有課/忙碌' });
    } else {
      free.push(member);
    }
  });

  return { busy, free };
};

const selectedCellStats = computed(() => {
  if (!selectedCell.value) return { busy: [], free: [] };
  return getCellStats(selectedCell.value.day, selectedCell.value.periodId);
});

const getCellClass = (day, periodId) => {
  if (totalActive.value === 0) return 'bg-white/2 border-white/5 text-gray-400';
  const { free } = getCellStats(day, periodId);
  const ratio = free.length / totalActive.value;
  if (ratio === 1) {
    return 'text-white font-bold';
  } else if (ratio === 0) {
    return 'bg-white/2 border-white/5 text-gray-600';
  }
  return 'text-white font-semibold';
};

const getCellStyle = (day, periodId) => {
  if (totalActive.value === 0) return {};
  const { free } = getCellStats(day, periodId);
  const ratio = free.length / totalActive.value;
  if (ratio === 1) {
    return {
      backgroundColor: '#22c55e',
      borderColor: '#22c55e'
    };
  } else if (ratio > 0 && ratio < 1) {
    return {
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6'
    };
  }
  return {};
};

const isHighlighted = (day, periodId) => {
  return props.highlightedSlots.some(s => s.day === day && s.periodId === periodId);
};

const selectCell = (day, periodId) => {
  selectedCell.value = { day, periodId };
  emit('cell-click', day, periodId);
};
</script>
