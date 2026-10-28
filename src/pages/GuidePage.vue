<script setup lang="ts">
import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { Pages, useGlobalState } from '@/composables/app-state';
import { openLink } from '@/services/open-link';
import BadgeLadder from '@/components/BadgeLadder.vue';
import SyncNotice from '@/components/SyncNotice.vue';
import { TIME_BADGE, VARIETY_BADGE } from '@/constants/badges';
import { GUIDE, LANGUAGE_PROMPT, type GuideLang } from '@/content/guide';
import { ORIGINAL_URL } from '@/constants/links';

const { setPage } = useGlobalState();


// Nothing is chosen the first time, so the Guide opens by asking which language to use.
const chosen = useLocalStorage<GuideLang | null>('guide.language', null);
const text = computed(() => (chosen.value ? GUIDE[chosen.value] : null));
const languages = Object.entries(GUIDE) as [GuideLang, (typeof GUIDE)[GuideLang]][];

function go(page: 'library' | 'variety') {
  setPage(page === 'library' ? Pages.LIBRARY : Pages.VARIETY);
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
    <!-- Language choice -->
    <section v-if="!text" class="panel mx-auto flex w-full max-w-xl flex-col items-center gap-6 p-10 text-center" aria-labelledby="lang-title">
      <h2 id="lang-title" class="font-display text-2xl font-bold">{{ LANGUAGE_PROMPT }}</h2>
      <div class="grid w-full gap-3 sm:grid-cols-2">
        <button
          v-for="[code, entry] in languages"
          :key="code"
          type="button"
          class="btn btn-primary py-4 text-lg"
          :lang="code"
          @click="chosen = code"
        >{{ entry.nativeName }}</button>
      </div>
    </section>

    <template v-else>
      <div class="flex justify-end" :lang="chosen ?? undefined">
        <button type="button" class="btn btn-small" @click="chosen = null">{{ text.changeLanguage }}</button>
      </div>

      <div class="contents" :lang="chosen ?? undefined">
        <section class="panel p-6" aria-labelledby="guide-title">
          <h2 id="guide-title" class="font-display text-2xl font-bold">{{ text.title }}</h2>
          <p class="mt-2 max-w-prose leading-relaxed text-muted">{{ text.intro }}</p>

          <ul class="mt-5 grid gap-4 md:grid-cols-3">
            <li v-for="use in text.uses" :key="use.title" class="flex flex-col rounded-xl border border-line-soft bg-ink p-4">
              <h3 class="text-base font-bold">{{ use.title }}</h3>
              <p class="mt-2 flex-1 text-sm leading-relaxed text-muted">{{ use.body }}</p>
              <button type="button" class="btn btn-small mt-4 self-start" @click="go(use.page)">{{ use.action }}</button>
            </li>
          </ul>
        </section>

        <section class="panel p-6" aria-labelledby="badges-title">
          <h2 id="badges-title" class="font-display text-2xl font-bold">{{ text.badgesTitle }}</h2>
          <p class="mt-2 max-w-prose leading-relaxed text-muted">{{ text.badgesIntro }}</p>
          <SyncNotice class="mt-4 max-w-prose" :text="text.syncNotice" />
          <div class="mt-6 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 class="text-base font-bold">{{ text.varietyTitle }}</h3>
              <p class="mb-4 mt-1 text-sm leading-relaxed text-muted">{{ text.varietyBody }}</p>
              <BadgeLadder :badge="VARIETY_BADGE" :medal="62" />
            </div>
            <div>
              <h3 class="text-base font-bold">{{ text.timeTitle }}</h3>
              <p class="mb-4 mt-1 text-sm leading-relaxed text-muted">{{ text.timeBody }}</p>
              <BadgeLadder :badge="TIME_BADGE" :medal="62" />
            </div>
          </div>
        </section>

        <div class="grid gap-6 md:grid-cols-2">
          <section class="panel p-6" aria-labelledby="steps-title">
            <h2 id="steps-title" class="text-lg font-bold">{{ text.stepsTitle }}</h2>
            <ol class="mt-4 flex flex-col gap-4">
              <li v-for="(step, i) in text.steps" :key="i" class="flex gap-3">
                <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised text-sm font-bold text-flame-hi">{{ i + 1 }}</span>
                <span class="pt-0.5 leading-relaxed">{{ step }}</span>
              </li>
            </ol>
          </section>

          <section class="panel p-6" aria-labelledby="know-title">
            <h2 id="know-title" class="text-lg font-bold">{{ text.knowTitle }}</h2>
            <ul class="mt-4 flex flex-col gap-3">
              <li v-for="note in text.notes" :key="note" class="flex gap-3 leading-relaxed text-muted">
                <span class="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flame" aria-hidden="true"></span>
                <span>{{ note }}</span>
              </li>
            </ul>
          </section>
        </div>

        <section class="panel flex flex-wrap items-center justify-between gap-4 p-6" aria-labelledby="credit-title">
          <div class="max-w-prose">
            <h2 id="credit-title" class="text-lg font-bold">{{ text.creditTitle }}</h2>
            <p class="mt-1 text-sm leading-relaxed text-muted">{{ text.creditBody }}</p>
          </div>
          <button type="button" class="btn" @click="openLink(ORIGINAL_URL)">{{ text.creditButton }}</button>
        </section>
      </div>
    </template>
  </div>
</template>
