export interface Result {
  checkpoint: string;
  time: string;
}

export interface Participant {
  id: string;
  name: string;
  results: Result[];
  startTime: number | null;
  nextCheckpointIndex: number;
}
