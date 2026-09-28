import {useState} from 'react';
import {Platform} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Android's declarative DateTimePicker does not support mode="datetime" —
 * it silently opens a DATE-only picker, so users could never choose a time
 * (live finding on the chat schedule + post-food forms). This hook runs the
 * two-step flow on Android (date, then time, combined) and the native
 * datetime picker on iOS.
 *
 * Usage:
 *   const {open, picker} = useDateTimePicker(value, onChange);
 *   <Pressable onPress={open}>…</Pressable>
 *   {picker}
 */
export function useDateTimePicker(value: Date, onChange: (d: Date) => void) {
  const [stage, setStage] = useState<'date' | 'time' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date>(value);

  const open = () => setStage('date');

  const picker = stage ? (
    <DateTimePicker
      value={stage === 'date' ? value : pendingDate}
      mode={Platform.OS === 'ios' ? 'datetime' : stage}
      onChange={(_event: unknown, date?: Date) => {
        if (Platform.OS === 'ios') {
          if (date) {
            onChange(date);
          }
          setStage(null);
          return;
        }
        if (stage === 'date') {
          if (date) {
            setPendingDate(date);
            setStage('time');
          } else {
            setStage(null);
          }
          return;
        }
        // time stage — combine with the date chosen in step one
        if (date) {
          onChange(
            new Date(
              pendingDate.getFullYear(),
              pendingDate.getMonth(),
              pendingDate.getDate(),
              date.getHours(),
              date.getMinutes(),
              0,
              0,
            ),
          );
        }
        setStage(null);
      }}
    />
  ) : null;

  return {open, picker};
}
