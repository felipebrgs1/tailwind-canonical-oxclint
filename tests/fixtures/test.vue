<template>
  <div class="flex-grow bg-gradient-to-r p-[16px]">
    <span class="shrink-0 bg-gradient-to-b w-[50%]">
      Hello
    </span>
    <button :class="isActive ? 'flex-grow' : 'shrink-0'">
      Click
    </button>
    <p class="bg-white text-black m-4">
      Already canonical
    </p>
    <a v-bind:class="'hover:flex-grow focus:bg-gradient-to-r'">
      Link
    </a>
  </div>
</template>

<script setup>
const isActive = true
</script>
