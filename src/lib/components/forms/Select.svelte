<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    value?: string;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
  }

  let {
    value = $bindable(),
    options,
    placeholder = 'Select an option',
    disabled = false,
    required = false
  }: Props = $props();
</script>

<select
  bind:value
  {disabled}
  {required}
  class="input"
>
  <option value="" disabled>{placeholder}</option>
  {#each options as option}
    <option value={option.value}>{option.label}</option>
  {/each}
</select>
