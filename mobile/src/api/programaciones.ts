import { apiClient } from './client';

export interface ProgramacionDto {
  horaInicio: number;
  horaFin: number;
  duracionHoras: number;
  potenciaW: number;
  costeEstimado: number;
  id_dispositivo: number;
}

export const getProgramaciones = () => apiClient.get('/programaciones');

export const crearProgramacion = (dto: ProgramacionDto) =>
  apiClient.post('/programaciones', dto);

export const eliminarProgramacion = (id: number) =>
  apiClient.delete(`/programaciones/${id}`);