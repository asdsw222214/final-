<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div class="glass-panel w-full max-w-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto" @click.stop>
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 class="text-base font-bold flex items-center gap-2 text-blue-400">
          <Settings2 class="w-5 h-5" />
          自訂課表節次與時間
        </h3>
        <button @click="$emit('close')" class="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
          <X class="w-4 h-4" />
        </button>
      </div>

      <p class="text-xs text-gray-400 leading-relaxed bg-white/5 border border-white/10 p-3 rounded-xl">
        填入每堂課的「節次名稱」與「起訖時間」（格式：24小時制，如 08:10）。修改後，熱力圖與組員課表將會立即調整為新設定的時間結構。
      </p>

      <!-- Periods Edit List -->
      <div class="flex-1 overflow-y-auto max-h-[40vh] flex flex-col gap-2 pr-1">
        <div 
          v-for="(p, index) in localPeriods" 
          :key="p.id" 
          class="flex items-center gap-2 bg-white/2 border border-white/5 p-2 rounded-xl"
        >
          <!-- Drag / Order badge -->
          <span class="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold font-mono text-gray-400">
            {{ index + 1 }}
          </span>

          <input
            type="text"
            v-model="p.name"
            placeholder="節次名稱"
            class="input-field py-1 px-2 text-xs w-24"
          />

          <div class="flex items-center gap-1">
            <input
              type="text"
              v-model="p.startTime"
              placeholder="08:00"
              class="input-field py-1 px-2 text-xs w-16 text-center font-mono"
            />
            <span class="text-gray-500">~</span>
            <input
              type="text"
              v-model="p.endTime"
              placeholder="08:50"
              class="input-field py-1 px-2 text-xs w-16 text-center font-mono"
            />
          </div>

          <button
            @click="removePeriod(p.id)"
            class="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 ml-auto transition-all"
            title="刪除此節次"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Add period button -->
      <button
        @click="addPeriod"
        class="btn btn-secondary py-1.5 px-3 text-xs self-start"
      >
        <Plus class="w-3.5 h-3.5" />
        新增節次
      </button>

      <div class="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
        <button
          @click="$emit('close')"
          class="btn btn-secondary py-2 px-4 text-xs"
        >
          取消
        </button>
        <button
          @click="confirmSave"
          class="btn btn-primary py-2 px-4 text-xs"
        >
          儲存設定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Settings2, X, Plus, Trash2 } from 'lucide-vue-next';

const props = defineProps({
  periods: {
    type: Array,
    required: true
  },
  isOpen: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close', 'save']);

const localPeriods = ref([]);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    localPeriods.value = JSON.parse(JSON.stringify(props.periods));
  }
});

const addPeriod = () => {
  const nextId = String(localPeriods.value.reduce((max, p) => Math.max(max, parseInt(p.id, 10) || 0), 0) + 1);
  let defaultStart = '08:00';
  let defaultEnd = '09:00';
  
  if (localPeriods.value.length > 0) {
    const last = localPeriods.value[localPeriods.value.length - 1];
    // Guess a default slot 10 mins after the last one
    try {
      const parts = last.endTime.split(':');
      let hours = parseInt(parts[0], 10);
      let mins = parseInt(parts[1], 10) + 10;
      if (mins >= 60) {
        hours += 1;
        mins -= 60;
      }
      const sh = String(hours).padStart(2, '0');
      const sm = String(mins).padStart(2, '0');
      
      let endMins = mins + 50;
      let endHours = hours;
      if (endMins >= 60) {
        endHours += 1;
        endMins -= 60;
      }
      const eh = String(endHours).padStart(2, '0');
      const em = String(endMins).padStart(2, '0');
      
      defaultStart = `${sh}:${sm}`;
      defaultEnd = `${eh}:${em}`;
    } catch {
      // Default to 8-9
    }
  }

  localPeriods.value.push({
    id: nextId,
    name: `第 ${nextId} 節`,
    startTime: defaultStart,
    endTime: defaultEnd
  });
};

const removePeriod = (id) => {
  localPeriods.value = localPeriods.value.filter(p => p.id !== id);
};

const validateTimeFormat = (timeStr) => {
  return /^\d{1,2}:\d{2}$/.test(timeStr.trim());
};

const confirmSave = () => {
  // Validate all inputs
  for (let i = 0; i < localPeriods.value.length; i++) {
    const p = localPeriods.value[i];
    if (p.name.trim() === '') {
      alert(`第 ${i + 1} 節次名稱不得為空`);
      return;
    }
    if (!validateTimeFormat(p.startTime) || !validateTimeFormat(p.endTime)) {
      alert(`節次「${p.name}」時間格式有誤，必須為 HH:mm 格式（例如 08:10）。`);
      return;
    }
  }

  emit('save', localPeriods.value);
};
</script>

<style scoped>
.modal-overlay {
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
