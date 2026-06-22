<template>
  <div class="app-container">
    <Header
      :theme="theme"
      @set-theme="$emit('set-theme', $event)"
      :groupName="groupName"
      @set-group-name="handleSetGroupName"
      @copy-group-link="handleCopyGroupLink"
      :isCopied="isLinkCopied"
      @leave-group="$emit('leave-group')"
    />

    <main class="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 max-w-[1600px] w-full mx-auto overflow-hidden">
      <!-- Left Side: Member management & preferences -->
      <div class="flex flex-col gap-6 overflow-hidden">
        <MemberList
          :groupId="groupId"
          :members="members"
          :buildMemberLink="buildMemberLink"
          @toggle-active="handleToggleActive"
          @edit-schedule="handleOpenEditModal"
          @import-schedule="handleOpenImportModal"
          @delete-member="handleDeleteMember"
          @refresh="$emit('refresh')"
        />

        <div class="glass-panel py-4 px-5">
          <h3 class="text-sm font-bold block mb-3 font-display">熱力圖偏好設定</h3>
          <div class="flex flex-col gap-3">
            <label class="flex items-center justify-between text-xs text-gray-400 cursor-pointer">
              <span>隱藏週末時段</span>
              <div class="toggle-switch">
                <input
                  type="checkbox"
                  :checked="excludeWeekends"
                  @change="handleSetExcludeWeekends($event.target.checked)"
                />
                <span class="toggle-slider"></span>
              </div>
            </label>
          </div>
        </div>

        <button @click="handleExportJSON" class="btn btn-secondary py-2 px-4 text-xs self-start">
          匯出 JSON 備份
        </button>
      </div>

      <!-- Right Side: Heatmap Grid & Smart Suggester -->
      <div class="flex flex-col gap-6 overflow-hidden">
        <div class="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 flex-1 min-h-[500px]">
          <ScheduleGrid
            :members="members"
            :periods="periods"
            :excludeWeekends="excludeWeekends"
            :highlightedSlots="highlightedSlots || undefined"
            @open-period-settings="isPeriodModalOpen = true"
            @export-png="handleExportPng"
          />

          <SmartSuggester
            :members="members"
            :periods="periods"
            :excludeWeekends="excludeWeekends"
            :meetingLength="meetingLength"
            @set-meeting-length="meetingLength = $event"
            :minAttendeesPercent="minAttendeesPercent"
            @set-min-attendees-percent="minAttendeesPercent = $event"
            :requiredMemberIds="requiredMemberIds"
            @set-required-member-ids="requiredMemberIds = $event"
            @select-slot="highlightedSlots = $event"
          />
        </div>
      </div>
    </main>

    <footer class="py-4 text-center text-xs text-gray-500 border-t border-white/5 bg-slate-950/20 mt-auto">
      &copy; {{ new Date().getFullYear() }} 課表空堂媒合排程助手 &bull; 小組代碼：
      <span class="font-mono text-gray-400">{{ groupId }}</span>
    </footer>

    <!-- Modals -->
    <ImportModal
      :member="selectedMember"
      :periods="periods"
      :isOpen="isImportModalOpen"
      @close="closeImportModal"
      @import="handleImportedSchedule"
    />

    <PeriodSettingsModal
      :periods="periods"
      :isOpen="isPeriodModalOpen"
      @close="isPeriodModalOpen = false"
      @save="handleSavePeriods"
    />

    <MemberEditModal
      :member="selectedMember"
      :periods="periods"
      :isOpen="isEditModalOpen"
      @close="closeEditModal"
      @save="handleSaveMemberSchedule"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import Header from './Header.vue';
import MemberList from './MemberList.vue';
import ScheduleGrid from './ScheduleGrid.vue';
import SmartSuggester from './SmartSuggester.vue';
import ImportModal from './ImportModal.vue';
import PeriodSettingsModal from './PeriodSettingsModal.vue';
import MemberEditModal from './MemberEditModal.vue';
import html2canvas from 'html2canvas';

const props = defineProps({
  groupId: {
    type: String,
    required: true
  },
  groupName: {
    type: String,
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
  members: {
    type: Array,
    required: true
  },
  theme: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['set-theme', 'leave-group', 'refresh']);

// Suggester Preference states
const meetingLength = ref(2);
const minAttendeesPercent = ref(100);
const requiredMemberIds = ref([]);
const highlightedSlots = ref(null);

// Modal states
const isImportModalOpen = ref(false);
const isPeriodModalOpen = ref(false);
const isEditModalOpen = ref(false);
const selectedMember = ref(null);

const isLinkCopied = ref(false);

// Clean up required members if they are deleted or set inactive
watch(() => props.members, (newMembers) => {
  const activeIds = newMembers.filter(m => m.isActive).map(m => m.id);
  requiredMemberIds.value = requiredMemberIds.value.filter(id => activeIds.includes(id));
}, { deep: true });

const buildGroupLink = () => {
  return `${window.location.origin}${window.location.pathname}?group=${props.groupId}`;
};

const buildMemberLink = (memberId) => {
  return `${window.location.origin}${window.location.pathname}?group=${props.groupId}&member=${memberId}`;
};

const handleCopyGroupLink = async () => {
  try {
    await navigator.clipboard.writeText(buildGroupLink());
    isLinkCopied.value = true;
    setTimeout(() => (isLinkCopied.value = false), 1800);
  } catch (err) {
    console.error('複製連結失敗', err);
  }
};

const handleSetGroupName = async (newName) => {
  try {
    const res = await fetch(`/api/groups/${props.groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    if (!res.ok) throw new Error('Rename group failed');
    emit('refresh');
  } catch (err) {
    console.error(err);
    alert('更新小組名稱失敗，請確認網路連線。');
  }
};

const handleSetExcludeWeekends = async (exclude) => {
  try {
    const res = await fetch(`/api/groups/${props.groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excludeWeekends: exclude })
    });
    if (!res.ok) throw new Error('Update exclude weekends failed');
    emit('refresh');
  } catch (err) {
    console.error(err);
  }
};

const handleToggleActive = async (memberId) => {
  const member = props.members.find(m => m.id === memberId);
  if (!member) return;
  try {
    const res = await fetch(`/api/groups/${props.groupId}/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !member.isActive })
    });
    if (!res.ok) throw new Error('Toggle active failed');
    emit('refresh');
  } catch (err) {
    console.error(err);
    alert('更新成員狀態失敗，請確認網路連線。');
  }
};

const handleDeleteMember = async (memberId) => {
  if (!window.confirm('確定要刪除此成員嗎？其課表資料將永久消失！')) return;
  try {
    const res = await fetch(`/api/groups/${props.groupId}/members/${memberId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Delete member failed');
    emit('refresh');
  } catch (err) {
    console.error(err);
    alert('刪除成員失敗，請確認網路連線。');
  }
};

const handleOpenEditModal = (member) => {
  selectedMember.value = member;
  isEditModalOpen.value = true;
};

const closeEditModal = () => {
  isEditModalOpen.value = false;
  selectedMember.value = null;
};

const handleSaveMemberSchedule = async (memberId, name, color, busySlots) => {
  try {
    const res = await fetch(`/api/groups/${props.groupId}/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, busySlots })
    });
    if (!res.ok) throw new Error('Save member schedule failed');
    closeEditModal();
    emit('refresh');
  } catch (err) {
    console.error(err);
    alert('儲存課表失敗，請確認網路連線。');
  }
};

const handleOpenImportModal = (member) => {
  selectedMember.value = member;
  isImportModalOpen.value = true;
};

const closeImportModal = () => {
  isImportModalOpen.value = false;
  selectedMember.value = null;
};

const handleImportedSchedule = async (memberId, busySlots) => {
  try {
    const res = await fetch(`/api/groups/${props.groupId}/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ busySlots })
    });
    if (!res.ok) throw new Error('Import schedule failed');
    closeImportModal();
    emit('refresh');
    alert('課表解析並匯入成功！');
  } catch (err) {
    console.error(err);
    alert('匯入失敗，請確認網路連線。');
  }
};

const handleSavePeriods = async (updatedPeriods) => {
  try {
    const res = await fetch(`/api/groups/${props.groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periods: updatedPeriods })
    });
    if (!res.ok) throw new Error('Save periods failed');
    isPeriodModalOpen.value = false;
    emit('refresh');
    alert('節次時間設定已更新！');
  } catch (err) {
    console.error(err);
    alert('更新節次設定失敗，請確認網路連線。');
  }
};

const handleExportJSON = () => {
  const data = {
    name: props.groupName,
    periods: props.periods,
    members: props.members
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${props.groupName.replace(/\s+/g, '_')}_空堂資料備份.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const handleExportPng = async () => {
  const gridEl = document.getElementById('empty-slots-schedule-grid');
  if (!gridEl) return;

  gridEl.classList.add('screenshot-export');

  try {
    const canvas = await html2canvas(gridEl, {
      backgroundColor: props.theme === 'dark' ? '#0f172a' : '#f8fafc',
      scale: 2,
      useCORS: true
    });
    const link = document.createElement('a');
    link.download = `${props.groupName.replace(/\s+/g, '_')}_空堂媒合熱力圖.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Export PNG failed:', error);
    alert('產生圖片失敗，請重試！');
  } finally {
    gridEl.classList.remove('screenshot-export');
  }
};
</script>
