<script lang="ts">
  interface Props {
    type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel';
    value?: any;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    min?: number | string;
    max?: number | string;
    step?: number | string;
  }

  let {
    type = 'text',
    value = $bindable(),
    placeholder,
    disabled = false,
    required = false,
    min,
    max,
    step
  }: Props = $props();
</script>

<input
  {type}
  bind:value
  {placeholder}
  {disabled}
  {required}
  {min}
  {max}
  {step}
  class="input"
/>