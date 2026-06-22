<template>
  <div class="glass-panel h-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold flex items-center gap-2">
        組員名單
        <span class="badge badge-secondary">{{ members.length }} 人</span>
      </h2>
      <button
        @click="isAdding = !isAdding"
        class="btn btn-primary py-1 px-3 text-xs"
      >
        <UserPlus class="w-3.5 h-3.5" />
        新增組員
      </button>
    </div>

    <!-- Add Member Form -->
    <form v-if="isAdding" @submit.prevent="handleSubmit" class="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-3 animate-fade-in">
      <div>
        <label class="text-xs text-gray-400 block mb-1">組員姓名</label>
        <input
          type="text"
          placeholder="例如：王小明"
          v-model="newMemberName"
          class="input-field py-1.5 px-3 w-full text-sm"
          ref="nameInput"
          autoFocus
        />
      </div>

      <div>
        <label class="text-xs text-gray-400 block mb-1">代表顏色</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            v-for="color in PRESET_COLORS"
            :key="color"
            @click="selectedColor = color"
            class="w-6 h-6 rounded-full border border-white/20 transition-all flex items-center justify-center cursor-pointer"
            :style="{ backgroundColor: color }"
          >
            <Check v-if="selectedColor === color" class="w-3 h-3 text-white drop-shadow" />
          </button>
        </div>
      </div>

      <p class="text-[11px] text-gray-400">
        新增後會產生一組專屬連結，複製給該組員，他打開連結就只會看到自己的課表填寫頁。
      </p>

      <div class="flex gap-2 justify-end">
        <button
          type="button"
          @click="isAdding = false"
          class="btn btn-secondary py-1 px-2.5 text-xs"
        >
          取消
        </button>
        <button
          type="submit"
          class="btn btn-primary py-1 px-3 text-xs"
          :disabled="!newMemberName.trim() || isSubmitting"
        >
          {{ isSubmitting ? '建立中…' : '確認新增並產生連結' }}
        </button>
      </div>
    </form>

    <!-- Newly created invite links -->
    <div v-if="pendingLinks.length > 0" class="flex flex-col gap-1.5">
      <div
        v-for="p in pendingLinks"
        :key="p.memberId"
        class="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-2 animate-fade-in"
      >
        <div class="flex items-center gap-2 min-w-0">
          <Link2 class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span class="text-xs font-semibold truncate">已建立 {{ p.name }} 的專屬連結</span>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            @click="copyToClipboard(p.link, p.memberId)"
            class="btn btn-secondary py-1 px-2 text-[10px]"
          >
            <Check v-if="copiedId === p.memberId" class="w-3 h-3 text-emerald-400" />
            <Copy v-else class="w-3 h-3" />
            {{ copiedId === p.memberId ? '已複製' : '複製連結' }}
          </button>
          <button
            @click="pendingLinks = pendingLinks.filter(x => x.memberId !== p.memberId)"
            class="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Member List Scroll Area -->
    <div class="flex-1 overflow-y-auto max-h-[350px] lg:max-h-[500px] flex flex-col gap-2 pr-1">
      <div v-if="members.length === 0" class="text-center py-8 text-gray-400 text-sm">
        目前無組員，請點擊上方按鈕新增！
      </div>
      <div
        v-else
        v-for="member in members"
        :key="member.id"
        class="p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2"
        :class="member.isActive ? 'bg-white/5 border-white/10' : 'bg-white/2 border-white/5 opacity-50'"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <input
            type="checkbox"
            :checked="member.isActive"
            @change="$emit('toggle-active', member.id)"
            class="w-4 h-4 rounded cursor-pointer accent-blue-500 flex-shrink-0"
            :id="`checkbox-${member.id}`"
          />
          <div
            class="w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: member.color }"
          />
          <span
            class="text-sm font-semibold truncate max-w-[90px] cursor-pointer"
            @click="$emit('toggle-active', member.id)"
            :title="member.name"
          >
            {{ member.name }}
          </span>
        </div>

        <div class="flex items-center gap-0.5 flex-shrink-0">
          <button
            @click="copyToClipboard(buildMemberLink(member.id), member.id)"
            class="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
            title="複製此組員的專屬連結"
          >
            <Check v-if="copiedId === member.id" class="w-3.5 h-3.5 text-emerald-400" />
            <Link2 v-else class="w-3.5 h-3.5" />
          </button>
          <button
            @click="$emit('import-schedule', member)"
            class="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
            title="（代為）匯入課表文字"
          >
            <Clipboard class="w-3.5 h-3.5" />
          </button>
          <button
            @click="$emit('edit-schedule', member)"
            class="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
            title="（代為）編輯課表/空堂"
          >
            <Edit2 class="w-3.5 h-3.5" />
          </button>
          <button
            @click="$emit('delete-member', member.id)"
            class="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all"
            title="刪除成員"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <p class="text-[10px] text-gray-500 leading-relaxed border-t border-white/10 pt-3">
      小提醒：點擊 <Link2 class="w-2.5 h-2.5 inline -mt-0.5" /> 可複製該組員的專屬連結傳給他本人填寫；
      編輯／匯入按鈕則是讓你（小組管理者）也能直接代為輸入，方便輔助不熟悉操作的組員。
    </p>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { UserPlus, Edit2, Trash2, Clipboard, Check, Link2, Copy, X } from 'lucide-vue-next';

const props = defineProps({
  groupId: {
    type: String,
    required: true
  },
  members: {
    type: Array,
    required: true
  },
  buildMemberLink: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['toggle-active', 'edit-schedule', 'import-schedule', 'delete-member', 'refresh']);

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#ec4899', '#8b5cf6',
  '#f59e0b', '#06b6d4', '#f97316', '#f43f5e'
];

const isAdding = ref(false);
const newMemberName = ref('');
const selectedColor = ref(PRESET_COLORS[0]);
const isSubmitting = ref(false);
const pendingLinks = ref([]);
const copiedId = ref(null);

const copyToClipboard = async (text, id) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = id;
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null;
    }, 1800);
  } catch (err) {
    console.error('複製失敗', err);
  }
};

const handleSubmit = async () => {
  if (newMemberName.value.trim() === '' || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const res = await fetch(`/api/groups/${props.groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newMemberName.value.trim(),
        color: selectedColor.value
      })
    });
    if (!res.ok) throw new Error('Add member failed');
    const { id: memberId } = await res.json();
    const link = props.buildMemberLink(memberId);
    
    pendingLinks.value.unshift({
      memberId,
      name: newMemberName.value.trim(),
      link
    });

    newMemberName.value = '';
    const nextIdx = (PRESET_COLORS.indexOf(selectedColor.value) + 1) % PRESET_COLORS.length;
    selectedColor.value = PRESET_COLORS[nextIdx];
    isAdding.value = false;
    emit('refresh');
  } catch (err) {
    console.error(err);
    alert('新增組員失敗，請確認網路連線後再試一次。');
  } finally {
    isSubmitting.value = false;
  }
};
</script>
