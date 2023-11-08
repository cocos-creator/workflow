'use strict';

import { registerTask, Task, TaskState } from './task';

class TscTask extends Task {
    getName() {
        return 'tsc';
    }
    getTitle() {
        return 'Compile with tsc';
    }

    execute(config: string[]): TaskState | Promise<TaskState> {
        return TaskState.success;
    }
}
registerTask(TscTask);
