<template>
  <div v-if="isOpen && member" class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div class="glass-panel w-full max-w-3xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto" @click.stop>
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 class="text-base font-bold flex items-center gap-2 text-blue-400">
          <Edit2 class="w-5 h-5" />
          編輯成員課表與資料 ({{ member.name }} - 管理者代填)
        </h3>
        <button @click="$emit('close')" class="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Basic Info Edit -->
      <div class="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col gap-3">
        <h4 class="text-xs font-bold text-gray-300">基本資料</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-400 block mb-1">姓名 / 代稱</label>
            <input
              type="text"
              v-model="localName"
              placeholder="成員姓名"
              class="input-field py-1.5 px-3 w-full text-xs"
            />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">代表顏色</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                type="button"
                v-for="c in PRESET_COLORS"
                :key="c"
                @click="localColor = c"
                class="w-5 h-5 rounded-full border border-white/20 transition-all flex items-center justify-center cursor-pointer"
                :style="{
                  backgroundColor: c,
                  outline: localColor === c ? '2px solid white' : 'none',
                  outlineOffset: '1px'
                }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Schedule Editor Grid -->
      <div class="flex-1 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-gray-300">課表劃記 (管理者模式)</h4>
          <button
            @click="clearAllSlots"
            class="btn btn-danger py-1 px-2.5 text-[10px]"
          >
            清空課表
          </button>
        </div>
        
        <ScheduleEditorGrid
          :periods="periods"
          :busySlots="localBusySlots"
          :color="localColor"
          @change="updateLocalSlots"
          maxHeight="35vh"
          :showHint="false"
        />
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
        <button
          @click="$emit('close')"
          class="btn btn-secondary py-2 px-4 text-xs"
        >
          取消
        </button>
        <button
          @click="confirmSave"
          :disabled="localName.trim() === ''"
          class="btn btn-primary py-2 px-4 text-xs disabled:opacity-50"
        >
          儲存變更
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Edit2, X } from 'lucide-vue-next';
import ScheduleEditorGrid from './ScheduleEditorGrid.vue';

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

const emit = defineEmits(['close', 'save']);

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#ec4899', '#8b5cf6',
  '#f59e0b', '#06b6d4', '#f97316', '#f43f5e'
];

const localName = ref('');
const localColor = ref('');
const localBusySlots = ref({});

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.member) {
    localName.value = props.member.name;
    localColor.value = props.member.color;
    localBusySlots.value = JSON.parse(JSON.stringify(props.member.busySlots || {}));
  }
});

const updateLocalSlots = (nextSlots) => {
  localBusySlots.value = nextSlots;
};

const clearAllSlots = () => {
  if (window.confirm('確定要清空此成員的所有課表時段嗎？')) {
    localBusySlots.value = {};
  }
};

const confirmSave = () => {
  if (localName.value.trim() === '' || !props.member) return;
  emit('save', props.member.id, localName.value.trim(), localColor.value, localBusySlots.value);
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
