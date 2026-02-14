
import { offlineStore, QueueItem } from './offlineStore';
import * as dashboardService from './dashboardService';

export const SyncManager = {
  isSyncing: false,

  init() {
    // Listen for online status
    window.addEventListener('online', () => {
      console.log('🌐 Online detected. Starting sync...');
      this.processQueue();
    });
    
    // Also try on app launch
    if (navigator.onLine) {
        setTimeout(() => this.processQueue(), 2000); // Small delay to let app load
    }
  },

  async processQueue() {
    if (this.isSyncing || !navigator.onLine) return;
    
    // Notify Start
    this.isSyncing = true;
    window.dispatchEvent(new CustomEvent('vidyasetu-sync-change', { detail: { isSyncing: true } }));

    try {
      const queue = await offlineStore.getQueue();
      if (queue.length === 0) {
        this.isSyncing = false;
        window.dispatchEvent(new CustomEvent('vidyasetu-sync-change', { detail: { isSyncing: false } }));
        return;
      }

      console.log(`🔄 Syncing ${queue.length} pending items...`);

      for (const item of queue) {
        let success = false;
        try {
            switch (item.type) {
                case 'SUBMIT_ATTENDANCE':
                    success = await dashboardService.submitAttendance(
                        item.payload.schoolId, 
                        item.payload.userId, 
                        item.payload.className, 
                        item.payload.records
                    );
                    break;
                case 'SUBMIT_PERIOD':
                    success = await dashboardService.submitPeriodData(
                        item.payload.schoolId,
                        item.payload.mobile,
                        item.payload.data,
                        item.payload.userName,
                        'submit'
                    );
                    break;
                case 'APPLY_LEAVE':
                    success = await dashboardService.applyForLeave(item.payload);
                    break;
                case 'APPLY_STUDENT_LEAVE':
                    success = await dashboardService.applyStudentLeave(item.payload);
                    break;
                case 'VISITOR_ENTRY':
                    success = await dashboardService.addVisitorEntry(item.payload);
                    break;
                case 'SUBMIT_HOMEWORK_STATUS':
                    success = await dashboardService.updateParentHomeworkStatus(
                        item.payload.schoolId,
                        item.payload.className,
                        item.payload.section,
                        item.payload.studentId,
                        item.payload.mobile,
                        item.payload.period,
                        item.payload.subject,
                        item.payload.date
                    );
                    break;
            }

            if (success && item.id) {
                await offlineStore.removeFromQueue(item.id);
                console.log(`✅ Item ${item.id} synced.`);
            }
        } catch (e) {
            console.error(`❌ Failed to sync item ${item.id}`, e);
            // We keep it in queue to retry later unless it's a fatal error
        }
      }
    } catch (err) {
      console.error("Sync process error", err);
    } finally {
      this.isSyncing = false;
      window.dispatchEvent(new CustomEvent('vidyasetu-sync-change', { detail: { isSyncing: false } }));
    }
  }
};
