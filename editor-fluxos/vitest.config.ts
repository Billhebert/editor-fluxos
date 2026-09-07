import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: [
        'src/domain/**',
        'src/use-cases/**',
        'src/adapters/**',
        'src/infrastructure/**',
        'src/main/**',
        'src/ui/**',
        'src/shared/**',
      ],
      exclude: [
        'src/**/index.ts',
        'src/**/__tests__/**',
        'src/ui/modals/**',
        'src/ui/schedules/ScheduleDetailView.ts',
        'src/ui/schedules/NewScheduleView.ts',
        'src/ui/schedules/PreviewView.ts',
        'src/ui/schedules/ScheduleListView.ts',
        'src/ui/VirtualKeyboardView.ts',
        'src/ui/FlowRenderer.ts',
        'src/ui/Toast.ts',
        'src/App.ts',
        'src/main.ts',
      ],
      thresholds: {
        lines: 30,
        statements: 30,
        functions: 30,
        branches: 30,
      },
    },
  },
});
