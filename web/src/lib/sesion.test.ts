import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sesion } from './api';
import { useSesion } from './sesion';

const sesionMock: Sesion = {
  token: 'jwt-token-sintetico',
  usuario: { id: 1, nombre: 'Ana', rol: 'PROFESOR' },
};

describe('useSesion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debe iniciar sin sesión activa', () => {
    const { result } = renderHook(() => useSesion());
    expect(result.current.sesion).toBeNull();
  });

  it('debe establecer la sesión en memoria al iniciar', () => {
    const { result } = renderHook(() => useSesion());
    act(() => {
      result.current.iniciar(sesionMock);
    });
    expect(result.current.sesion).toEqual(sesionMock);
  });

  it('debe limpiar la sesión al cerrar manualmente', () => {
    const { result } = renderHook(() => useSesion());
    act(() => {
      result.current.iniciar(sesionMock);
    });
    act(() => {
      result.current.cerrar();
    });
    expect(result.current.sesion).toBeNull();
  });

  it('debe expirar la sesión automáticamente tras 30 minutos de inactividad (US-17 CA 4)', () => {
    const { result } = renderHook(() => useSesion());
    act(() => {
      result.current.iniciar(sesionMock);
    });
    expect(result.current.sesion).toEqual(sesionMock);

    // 29 minutos después la sesión sigue vigente
    act(() => {
      vi.advanceTimersByTime(29 * 60 * 1000);
    });
    expect(result.current.sesion).toEqual(sesionMock);

    // Al llegar a los 30 minutos exactos la sesión expira
    act(() => {
      vi.advanceTimersByTime(1 * 60 * 1000);
    });
    expect(result.current.sesion).toBeNull();
  });

  it('debe reiniciar el temporizador al registrar eventos de actividad del usuario', () => {
    const { result } = renderHook(() => useSesion());
    act(() => {
      result.current.iniciar(sesionMock);
    });

    // 20 minutos de inactividad
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    expect(result.current.sesion).toEqual(sesionMock);

    // Usuario interactúa (actividad)
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    // 20 minutos más (40 min desde inicio, pero 20 min desde actividad)
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    expect(result.current.sesion).toEqual(sesionMock);

    // 10 minutos más (30 min desde la última actividad) -> expira
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(result.current.sesion).toBeNull();
  });

  it('debe persistir la sesión en sessionStorage para soportar recargas de página (F5)', () => {
    const { result } = renderHook(() => useSesion());
    act(() => {
      result.current.iniciar(sesionMock);
    });
    expect(result.current.sesion).toEqual(sesionMock);

    // Simular recarga de página montando una nueva instancia del hook
    const { result: recargado } = renderHook(() => useSesion());
    expect(recargado.current.sesion).toEqual(sesionMock);
  });

  it('debe remover la sesión de sessionStorage al cerrar sesión', () => {
    const { result } = renderHook(() => useSesion());
    act(() => {
      result.current.iniciar(sesionMock);
    });
    act(() => {
      result.current.cerrar();
    });
    expect(sessionStorage.getItem('calisfacu_sesion')).toBeNull();
  });

  it('debe limpiar el hash de la URL al cerrar sesión', () => {
    window.location.hash = '#auditoria';
    const { result } = renderHook(() => useSesion());
    act(() => {
      result.current.iniciar(sesionMock);
    });
    act(() => {
      result.current.cerrar();
    });
    expect(window.location.hash).toBe('');
  });
});
