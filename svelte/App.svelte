<script lang="ts">

	import { onMount } from "svelte";

	onMount(() => {
		document.querySelectorAll<HTMLParamElement>('span').forEach(span => {
			span.addEventListener('click', () => {
				let selection = window.getSelection();
				let range = document.createRange();
				range.selectNodeContents(span);
				selection.removeAllRanges();
				selection.addRange(range);
				navigator.clipboard.writeText(span.textContent);
			})
		});
	})

</script>
 
<main>
	<h1>Hello World!</h1> 
	<p>This is a complete boilerplate for building Electron applications using Svelte, TypeScript and SASS.</p>

	<p>The included CLI app will handle all the compilation a single terminal. You can start it by using <span>npm run dev</span> in the root folder or by running everything separately:</p>
	<br>
	<p class="pre">TypeScript <span>tsc -w</span> <span>cd src</span></p>
	<p class="pre">Svelte <span>npm run svelte-dev</span></p>
	<p class="pre">Sass <span>sass --watch app/sass:app/css</span></p>
	<p class="pre">Electron <span>electron . --dev</span></p>
	<br>
	<p>Click on a command to copy it to the clipboard.</p>
</main> 

<style lang="scss"> 
 
	main { 
		text-align: center;
		padding: 1em;
		max-width: 440px;
		margin: 0 auto;

		h1 {
			color: #ff3e00;
			text-transform: uppercase;
			font-size: 4em;
			font-weight: 100;
		}

		p {

			&.pre { 
				white-space: pre;
				display: block;
				text-align: left;
				border-bottom: solid 1px rgba(0, 0, 0, 0.1);
				padding-bottom: 3px;

				span {
					float: right;
					margin-left: 5px;
				}
			}

			span {
				background-color: rgba(0, 0, 0, 0.1);
				display: inline-block;
				padding: 1px 5px;
				border: solid 1px rgba(0, 0, 0, 0.2);
				border-radius: 6px;
				font-family: monospace;
				cursor: pointer;
			}
		}
	}

</style>