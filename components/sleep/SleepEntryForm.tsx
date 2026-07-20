import { createEntryAction } from '@/app/actions/sleep-entries'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { WheelDateTimePicker } from '@/components/ui/WheelDateTimePicker'

type SleepEntryFormProps = {
  defaultBedTime: string
  defaultWakeTime: string
}

export function SleepEntryForm({ defaultBedTime, defaultWakeTime }: SleepEntryFormProps) {
  return (
    <Card>
      <form action={createEntryAction} className="flex flex-col gap-4">
        <WheelDateTimePicker name="bedTime" label="Bed time" defaultValue={defaultBedTime} />
        <WheelDateTimePicker name="wakeTime" label="Wake time" defaultValue={defaultWakeTime} />
        <Field label="Note (optional)" htmlFor="note">
          <textarea
            id="note"
            name="note"
            rows={2}
            placeholder="e.g. afternoon nap, woke up twice…"
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </Field>
        <SubmitButton label="Save" pendingLabel="Saving…" />
      </form>
    </Card>
  )
}
