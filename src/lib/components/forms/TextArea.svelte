<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		rows?: number;
	}

	let {
		value = $bindable(),
		placeholder,
		disabled = false,
		required = false,
		rows = 4
	}: Props = $props();
</script>

<textarea bind:value {placeholder} {disabled} {required} {rows} class="input resize-y"></textarea>
