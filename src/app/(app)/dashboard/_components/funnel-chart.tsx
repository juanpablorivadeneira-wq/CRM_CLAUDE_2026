'use client';

type Stage = {
  stageId: string;
  name: string;
  count: number;
  value: number;
  isWon: boolean;
};

export function FunnelChart({ data }: { data: Stage[] }) {
  if (data.length === 0) {
    return (
      <p className="text-center py-8 text-sm text-muted-foreground">
        Sin oportunidades para mostrar.
      </p>
    );
  }

  const maxCount = Math.max(...data.map((s) => s.count), 1);

  return (
    <div className="space-y-2">
      {data.map((stage) => {
        const width = (stage.count / maxCount) * 100;
        return (
          <div key={stage.stageId} className="flex items-center gap-3">
            <div className="w-40 truncate text-sm">{stage.name}</div>
            <div className="flex-1 bg-muted h-7 rounded-md overflow-hidden relative">
              <div
                className={`h-full transition-all ${stage.isWon ? 'bg-green-500/70' : 'bg-primary/60'}`}
                style={{ width: `${width}%` }}
              />
              <div className="absolute inset-0 flex items-center px-2 text-xs">
                <span className="font-medium">{stage.count}</span>
                {stage.value > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    · ${stage.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
