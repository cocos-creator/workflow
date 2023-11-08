'use strict';

import { registerTask, Task, TaskState } from './task';

class TscTask extends Task {
    get title() {
        return 'Compile with tsc';
    }

    execute(config: string[]): TaskState | Promise<TaskState> {
        return TaskState.success;
    }
}
registerTask('internal:tsc', TscTask);
