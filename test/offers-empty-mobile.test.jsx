// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, stubFetch } from './app-test-helpers';
afterEach(()=>{cleanup();window.innerWidth=1024;vi.unstubAllGlobals();history.replaceState(null,'','/');});
it('показывает сброс пустого результата даже при свёрнутой мобильной панели',async()=>{
 window.innerWidth=320;history.replaceState(null,'','/?priceFrom=100&sort=price&order=desc');
 stubFetch({goods:[{brand:'ASAM',number:'1',warehouses:[{code:'А',price:10,stock:2}]}]});
 renderApp({number:'1',brand:'ASAM'});
 await screen.findByText('Ничего не найдено по выбранным фильтрам');
 expect(screen.getByRole('button',{name:'Фильтры (1)'})).toHaveAttribute('aria-expanded','false');
 const reset=screen.getByRole('button',{name:'Сбросить фильтры'});expect(reset).toBeVisible();
 await userEvent.setup().click(reset);await screen.findByRole('table');expect(location.search).toContain('sort=price&order=desc');
});
