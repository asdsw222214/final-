<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div class="glass-panel w-full max-w-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto" @click.stop>
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 class="text-base font-bold flex items-center gap-2 text-blue-400">
          <ClipboardPaste class="w-5 h-5" />
          智慧匯入課表文字 ({{ member?.name }})
        </h3>
        <button @click="$emit('close')" class="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="text-xs text-gray-400 leading-relaxed bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col gap-1.5">
        <span class="font-bold text-gray-300">💡 智慧貼上說明：</span>
        <p>1. 請直接將選課系統的<b>「功課表」、「課表查詢結果」或含有時間的課表文字</b>整段複製（Ctrl+A、Ctrl+C），並貼在下方輸入框中。</p>
        <p>2. 解析器會自動尋找代表星期（如：週一、Mon）與時間段（如：10:10-12:00 或第 3,4 節）的內容，自動勾選對應時段。</p>
        <p class="text-amber-400/90 font-medium">※ 由於各校課表格式眾多，匯入後請務必對照原始課表，以防解析有漏或誤判，並手動在網格上增減微調！</p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-xs text-gray-400 font-semibold">在此貼上複製的課表文字內容：</label>
        <textarea
          v-model="inputText"
          @input="handleParse"
          rows="6"
          placeholder="例如：
微積分 一/3,4(MA101)
軟體工程 星期三 13:10-15:00"
          class="input-field w-full text-xs font-mono resize-none p-3 h-24"
        ></textarea>
      </div>

      <!-- Parsing Result Preview -->
      <div v-if="inputText.trim() !== ''" class="flex flex-col gap-2">
        <span class="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
          <Sparkles class="w-4 h-4 text-amber-400" />
          解析預覽：
          <span v-if="parseResult && parseResult.parsedCount > 0" class="text-emerald-400 font-bold">
            偵測到 {{ parseResult.parsedCount }} 個忙碌時段！
          </span>
          <span v-else class="text-rose-400 font-semibold">
            未偵測到任何合法時段，請調整格式或手動劃記。
          </span>
        </span>

        <div 
          v-if="parseResult && parseResult.parsedCount > 0"
          class="max-h-[150px] overflow-y-auto border border-white/10 bg-black/20 rounded-xl p-2.5 text-[11px] text-gray-300 flex flex-col gap-1"
        >
          <div v-for="day in Object.keys(parseResult.busySlots)" :key="day">
            <span class="font-bold text-blue-400">{{ DAY_LABELS[day] }}：</span>
            <span 
              v-for="pId in Object.keys(parseResult.busySlots[day])" 
              :key="pId"
              class="inline-block bg-white/5 border border-white/10 px-1.5 py-0.5 rounded mr-1.5 mb-1"
            >
              {{ getPeriodName(pId) }} ({{ parseResult.busySlots[day][pId] || '課堂' }})
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
        <button
          @click="$emit('close')"
          class="btn btn-secondary py-2 px-4 text-xs"
        >
          取消
        </button>
        <button
          @click="confirmImport"
          :disabled="!parseResult || parseResult.parsedCount === 0"
          class="btn btn-primary py-2 px-4 text-xs disabled:opacity-50"
        >
          確認匯入課表
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ClipboardPaste, X, Sparkles } from 'lucide-vue-next';
import { parsePastedSchedule } from '../utils/parser';

const props = defineProps({
  member: {
    type: Object,
    default: null
  },
  periods: {
    type: Array,
    required: true
  },
  isOpen: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close', 'import']);

const DAY_LABELS = {
  M: '週一',
  T: '週二',
  W: '週三',
  TH: '週四',
  F: '週五',
  S: '週六',
  SU: '週日'
};

const inputText = ref('');
const parseResult = ref(null);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    inputText.value = '';
    parseResult.value = null;
  }
});

const getPeriodName = (periodId) => {
  const p = props.periods.find(x => x.id === periodId);
  return p ? p.name : periodId;
};

const handleParse = () => {
  parseResult.value = parsePastedSchedule(inputText.value, props.periods);
};

const confirmImport = () => {
  if (parseResult.value && parseResult.value.parsedCount > 0 && props.member) {
    emit('import', props.member.id, parseResult.value.busySlots);
  }
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
