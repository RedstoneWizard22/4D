<script>
  import '../app.postcss';

  // Enable prerendering for the whole site
  export const csr = false;
  export const prerender = true;
</script>

<slot />
