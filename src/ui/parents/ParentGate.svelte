<script lang="ts">
  import { checkGate, newGateTask } from '../../logic/parentGate';

  let { onPass, onCancel }: { onPass: () => void; onCancel: () => void } = $props();

  let task = $state(newGateTask());
  let input = $state('');
  let wrong = $state(false);

  function press(d: string) {
    if (input.length >= 2) return;
    input += d;
    if (input.length === 2) {
      if (checkGate(task, input)) onPass();
      else {
        wrong = true;
        setTimeout(() => {
          wrong = false;
          input = '';
          task = newGateTask();
        }, 600);
      }
    }
  }
</script>

<div class="gate" role="dialog" aria-label="Eltern-Bereich entsperren">
  <p class="hint">Für Eltern: Bitte rechnen</p>
  <p class="task" class:wrong>
    {task.a} + {task.b} = <span class="input">{input || '?'}</span>
  </p>
  <div class="pad">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as d (d)}
      <button onclick={() => press(d)}>{d}</button>
    {/each}
  </div>
  <button class="cancel" onclick={onCancel}>Zurück zum Spiel</button>
</div>

<style>
  .gate {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2.5vmin;
    background: #f4f1ea;
    color: #1f2937;
    font-family: system-ui, -apple-system, sans-serif;
    padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom);
  }
  .hint {
    margin: 0;
    font-size: 16px;
    color: #6b7280;
  }
  .task {
    margin: 0;
    font-size: clamp(28px, 7vmin, 48px);
    font-weight: 600;
  }
  .task.wrong {
    color: #dc2626;
    animation: shake 0.3s;
  }
  .input {
    display: inline-block;
    min-width: 2ch;
    text-align: center;
    border-bottom: 3px solid currentColor;
  }
  .pad {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }
  .pad button {
    width: clamp(48px, 11vmin, 72px);
    height: clamp(48px, 11vmin, 72px);
    font-size: 22px;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    background: #fff;
    color: #1f2937;
  }
  .cancel {
    border: none;
    background: none;
    color: #4b5563;
    font-size: 16px;
    text-decoration: underline;
    padding: 8px;
  }
  @keyframes shake {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
</style>
