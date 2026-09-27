/**
 * AetherOS Virtual Memory Manager
 * Simulates Paged Virtual Memory Allocator (4KB Page Frames, Page Tables, Swap, and Memory Stats).
 */

class PageFrame {
    constructor(frameId) {
        this.frameId = frameId;
        this.allocated = false;
        this.processId = null;
        this.pageIndex = null;
        this.lastAccessed = Date.now();
    }
}

class VirtualMemoryManager {
    constructor(totalRamKB = 65536, pageSizeKB = 4) { // Default 64MB RAM, 4KB Pages
        this.totalRamKB = totalRamKB;
        this.pageSizeKB = pageSizeKB;
        this.totalFrames = Math.floor(totalRamKB / pageSizeKB); // 16,384 Frames
        this.frames = [];
        this.pageTables = {}; // pid -> Array of page entries
        this.pageFaults = 0;
        this.totalAllocatedKB = 0;

        for (let i = 0; i < this.totalFrames; i++) {
            this.frames.push(new PageFrame(i));
        }

        // Reserve kernel memory (System reserved 8MB = 2048 frames)
        this.allocate(1, 8192, 'System Kernel');
    }

    allocate(pid, requiredSizeKB, processName = 'Process') {
        let pagesNeeded = Math.ceil(requiredSizeKB / this.pageSizeKB);
        let freeFrames = this.frames.filter(f => !f.allocated);

        if (freeFrames.length < pagesNeeded) {
            return {
                success: false,
                error: `Out of Memory! Needed ${requiredSizeKB}KB (${pagesNeeded} pages), available ${freeFrames.length * this.pageSizeKB}KB.`
            };
        }

        let allocatedFrames = [];
        for (let i = 0; i < pagesNeeded; i++) {
            let frame = freeFrames[i];
            frame.allocated = true;
            frame.processId = pid;
            frame.pageIndex = i;
            frame.lastAccessed = Date.now();
            allocatedFrames.push(frame.frameId);
        }

        this.pageTables[pid] = {
            pid,
            processName,
            sizeKB: requiredSizeKB,
            pagesNeeded,
            frameIds: allocatedFrames,
            allocatedAt: new Date()
        };

        this.totalAllocatedKB += pagesNeeded * this.pageSizeKB;
        return { success: true, pid, pagesNeeded, allocatedKB: pagesNeeded * this.pageSizeKB };
    }

    free(pid) {
        let table = this.pageTables[pid];
        if (!table) return { success: false, error: 'Process memory not found' };

        for (let frameId of table.frameIds) {
            let frame = this.frames[frameId];
            if (frame) {
                frame.allocated = false;
                frame.processId = null;
                frame.pageIndex = null;
            }
        }

        this.totalAllocatedKB -= table.pagesNeeded * this.pageSizeKB;
        delete this.pageTables[pid];
        return { success: true, freedKB: table.pagesNeeded * this.pageSizeKB };
    }

    getMemoryStats() {
        let usedKB = this.totalAllocatedKB;
        let freeKB = this.totalRamKB - usedKB;
        let usagePercent = ((usedKB / this.totalRamKB) * 100).toFixed(1);

        return {
            totalRamKB: this.totalRamKB,
            usedKB,
            freeKB,
            usagePercent: parseFloat(usagePercent),
            totalFrames: this.totalFrames,
            freeFrames: this.totalFrames - Math.ceil(usedKB / this.pageSizeKB),
            pageFaults: this.pageFaults,
            processesCount: Object.keys(this.pageTables).length
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VirtualMemoryManager, PageFrame };
}
