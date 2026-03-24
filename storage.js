const StorageAPI = (() => {
  const KEYS = {
    activos: "postits_v1",
    archivados: "postits_archivados_v1",
    editar: "postit_para_editar"
  };

  const read = (key, fallback = []) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  };

  return {
    async getActivos() {
      return read(KEYS.activos, []);
    },

    async setActivos(data) {
      return write(KEYS.activos, data);
    },

    async getArchivados() {
      return read(KEYS.archivados, []);
    },

    async setArchivados(data) {
      return write(KEYS.archivados, data);
    },

    async getPostitEditar() {
      try {
        const raw = localStorage.getItem(KEYS.editar);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    async setPostitEditar(data) {
      return write(KEYS.editar, data);
    },

    async clearPostitEditar() {
      localStorage.removeItem(KEYS.editar);
    }
  };
})();