<template>
  <div class="glass-panel flex flex-col gap-4">
    <h2 class="text-lg font-bold flex items-center gap-2 text-amber-400 font-display">
      <Sparkles class="w-5 h-5" />
      智慧會議推薦
    </h2>

    <!-- Suggester parameters -->
    <div class="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs text-gray-400 block mb-1">會議長度</label>
          <select
            :value="meetingLength"
            @change="$emit('set-meeting-length', parseInt($event.target.value, 10))"
            class="input-field py-1.5 px-3 w-full text-xs font-semibold"
          >
            <option :value="1">1 節課 (約50分)</option>
            <option :value="2">2 節課 (約2小時)</option>
            <option :value="3">3 節課 (約3小時)</option>
            <option :value="4">4 節課 (約4小時)</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">最低出席率</label>
          <select
            :value="minAttendeesPercent"
            @change="$emit('set-min-attendees-percent', parseInt($event.target.value, 10))"
            class="input-field py-1.5 px-3 w-full text-xs font-semibold"
          >
            <option :value="100">100% 全員到齊</option>
            <option :value="75">&gt;= 75% 成員有空</option>
            <option :value="50">&gt;= 50% 半數以上</option>
          </select>
        </div>
      </div>

      <!-- Required Members -->
      <div v-if="activeMembers.length > 0">
        <label class="text-xs text-gray-400 block mb-1">必到人員（開會核心人物）</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="member in activeMembers"
            :key="member.id"
            @click="handleToggleRequired(member.id)"
            class="btn py-1 px-2.5 text-[10px] rounded-lg flex items-center gap-1"
            :class="
              requiredMemberIds.includes(member.id)
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                : 'bg-white/5 border-white/10 text-gray-400'
            "
          >
            <CheckCircle v-if="requiredMemberIds.includes(member.id)" class="w-2.5 h-2.5 text-amber-400" />
            {{ member.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Suggester results -->
    <div class="flex-1 flex flex-col gap-2">
      <span class="text-xs text-gray-400 font-semibold block">最佳時段建議：</span>
      <div v-if="totalActive === 0" class="text-center py-6 text-xs text-gray-400">
        請先勾選組員以進行媒合推薦
      </div>
      <div v-else-if="recommendations.length === 0" class="text-center py-6 text-xs text-rose-300/80 bg-rose-500/5 rounded-xl border border-rose-500/10">
        在當前條件下（包含必到人員及出席率），未找到合適時段。請放寬條件試試！
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="(rec, index) in recommendations"
          :key="index"
          @mouseenter="highlightSlot(rec)"
          @mouseleave="$emit('select-slot', null)"
          class="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
        >
          <div class="flex items-center gap-3">
            <div class="bg-amber-500/10 text-amber-400 p-2 rounded-lg font-bold font-display text-sm">
              #{{ index + 1 }}
            </div>
            <div>
              <span class="font-semibold text-sm block">
                {{ DAY_LABELS[rec.day] }} {{ rec.periods[0].name }} ~ {{ rec.periods[rec.periods.length - 1].name }}
              </span>
              <span class="text-[11px] text-gray-400 block mt-0.5">
                {{ rec.periods[0].startTime }} - {{ rec.periods[rec.periods.length - 1].endTime }}
              </span>
            </div>
          </div>

          <div class="text-right">
            <span class="badge badge-success text-[11px] font-bold">
              出席：{{ rec.freeCount }} / {{ totalActive }} ({{ Math.round(rec.attendeeRatio * 100) }}%)
            </span>
            <span 
              v-if="rec.busyMembers.length > 0" 
              class="text-[9px] text-gray-400 block mt-1 max-w-[120px] truncate" 
              :title="rec.busyMembers.map(bm => `${bm.member.name} (${bm.reason})`).join(', ')"
            >
              忙碌：{{ rec.busyMembers.map(bm => bm.member.name).join(', ') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Sparkles, CheckCircle } from 'lucide-vue-next';

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
  meetingLength: {
    type: Number,
    required: true
  },
  minAttendeesPercent: {
    type: Number,
    required: true
  },
  requiredMemberIds: {
    type: Array,
    required: true
  }
});

const emit = defineEmits([
  'set-meeting-length',
  'set-min-attendees-percent',
  'set-required-member-ids',
  'select-slot'
]);

const DAY_LABELS = {
  M: '週一',
  T: '週二',
  W: '週三',
  TH: '週四',
  F: '週五',
  S: '週六',
  SU: '週日'
};

const activeMembers = computed(() => props.members.filter(m => m.isActive));
const totalActive = computed(() => activeMembers.value.length);

const handleToggleRequired = (id) => {
  if (props.requiredMemberIds.includes(id)) {
    emit('set-required-member-ids', props.requiredMemberIds.filter(x => x !== id));
  } else {
    emit('set-required-member-ids', [...props.requiredMemberIds, id]);
  }
};

const checkTimeOverlap = (s1, e1, s2, e2) => {
  const timeToMinutes = (timeStr) => {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + (parseInt(parts[1], 10) || 0);
  };
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return Math.max(start1, start2) < Math.min(end1, end2);
};

const recommendations = computed(() => {
  if (totalActive.value === 0 || props.periods.length < props.meetingLength) return [];

  const recList = [];
  const days = props.excludeWeekends ? ['M', 'T', 'W', 'TH', 'F'] : ['M', 'T', 'W', 'TH', 'F', 'S', 'SU'];

  days.forEach(day => {
    // Look for consecutive periods
    for (let i = 0; i <= props.periods.length - props.meetingLength; i++) {
      const consecutivePeriods = props.periods.slice(i, i + props.meetingLength);
      
      const freeMembers = [];
      const busyMembersMap = new Map();

      activeMembers.value.forEach(member => {
        let isBusyInWindow = false;
        let busyReasons = [];

        consecutivePeriods.forEach(period => {
          const reason = member.busySlots[day]?.[period.id];
          if (reason !== undefined) {
            isBusyInWindow = true;
            busyReasons.push(reason || '有課/忙碌');
          }
        });

        if (isBusyInWindow) {
          busyMembersMap.set(member.id, {
            member,
            reason: Array.from(new Set(busyReasons)).join(', ')
          });
        } else {
          freeMembers.push(member);
        }
      });

      // Check if all required members are free in this slot
      const allRequiredFree = props.requiredMemberIds.every(reqId => 
        freeMembers.some(fm => fm.id === reqId)
      );

      if (!allRequiredFree) continue;

      const attendeeRatio = freeMembers.length / totalActive.value;
      const attendeePercent = attendeeRatio * 100;

      if (attendeePercent >= props.minAttendeesPercent) {
        recList.push({
          day,
          periods: consecutivePeriods,
          freeCount: freeMembers.length,
          freeMembers,
          busyMembers: Array.from(busyMembersMap.values()),
          attendeeRatio
        });
      }
    }
  });

  // Sort: attendee ratio desc, day order, earliest time first
  const dayOrder = ['M', 'T', 'W', 'TH', 'F', 'S', 'SU'];
  return recList
    .sort((a, b) => {
      if (b.attendeeRatio !== a.attendeeRatio) {
        return b.attendeeRatio - a.attendeeRatio;
      }
      if (a.day !== b.day) {
        return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      }
      return a.periods[0].startTime.localeCompare(b.periods[0].startTime);
    })
    .slice(0, 5); // top 5 only
});

const highlightSlot = (rec) => {
  const highlights = rec.periods.map(p => ({
    day: rec.day,
    periodId: p.id
  }));
  emit('select-slot', highlights);
};
</script>
