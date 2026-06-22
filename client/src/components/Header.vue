<template>
  <header class="glass-panel rounded-none border-t-0 border-x-0 py-4 px-6 flex items-center justify-between z-20">
    <div class="flex items-center gap-3">
      <div class="bg-gradient-to-tr from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center">
        <Calendar class="w-6 h-6 text-white" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <div v-if="isEditing" class="flex items-center gap-1">
            <input
              type="text"
              v-model="editVal"
              @keydown.enter="handleSave"
              class="input-field py-1 px-2 text-lg font-bold w-48 font-display"
              ref="editInput"
              autoFocus
            />
            <button
              @click="handleSave"
              class="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
            >
              <Check class="w-4 h-4" />
            </button>
          </div>
          <h1 v-else class="text-xl md:text-2xl font-extrabold font-display flex items-center gap-2">
            {{ groupName }}
            <button
              @click="startEdit"
              class="p-1 hover:bg-white/10 rounded-lg text-text-muted hover:text-white transition-all"
              title="重新命名群組"
            >
              <Edit3 class="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          </h1>
          <span class="badge badge-primary hidden md:inline-flex">課表空堂媒合器</span>
        </div>
        <p class="text-xs text-gray-400 mt-0.5">每位組員透過專屬連結各自填寫課表，即時同步找出共同空檔</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        @click="$emit('copy-group-link')"
        class="btn btn-secondary py-2 px-3 text-xs hidden sm:flex"
        title="複製小組總覽連結，分享給其他人"
      >
        <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
        <Link2 v-else class="w-3.5 h-3.5" />
        {{ isCopied ? '已複製連結' : '複製小組連結' }}
      </button>

      <button
        @click="$emit('copy-group-link')"
        class="btn btn-secondary p-2.5 rounded-xl sm:hidden"
        title="複製小組總覽連結"
      >
        <Copy class="w-4 h-4" />
      </button>

      <button
        @click="$emit('set-theme', theme === 'dark' ? 'light' : 'dark')"
        class="btn btn-secondary p-2.5 rounded-xl flex items-center justify-center transition-all hover:scale-105"
        :title="theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'"
      >
        <Sun v-if="theme === 'dark'" class="w-5 h-5 text-amber-400" />
        <Moon v-else class="w-5 h-5 text-indigo-500" />
      </button>

      <button
        @click="$emit('leave-group')"
        class="btn btn-secondary p-2.5 rounded-xl flex items-center justify-center transition-all hover:scale-105"
        title="返回首頁"
      >
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { Sun, Moon, Calendar, Edit3, Check, Link2, LogOut, Copy } from 'lucide-vue-next';

const props = defineProps({
  theme: {
    type: String,
    required: true
  },
  groupName: {
    type: String,
    required: true
  },
  isCopied: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['set-theme', 'set-group-name', 'copy-group-link', 'leave-group']);

const isEditing = ref(false);
const editVal = ref(props.groupName);
const editInput = ref(null);

const startEdit = () => {
  editVal.value = props.groupName;
  isEditing.value = true;
  nextTick(() => {
    if (editInput.value) {
      editInput.value.focus();
    }
  });
};

const handleSave = () => {
  if (editVal.value.trim() !== '') {
    emit('set-group-name', editVal.value.trim());
  }
  isEditing.value = false;
};
</script>
