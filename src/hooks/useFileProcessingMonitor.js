import { useEffect, useRef, useCallback } from 'react';
import fileApi from '../api/fileApi';

/**
 * 파일 처리 상태를 모니터링하는 커스텀 훅
 *
 * @param {Array} files - 파일 목록
 * @param {Function} onStatusUpdate - 상태 업데이트 콜백
 * @param {Object} options - 옵션
 * @param {boolean} options.enabled - 모니터링 활성화 여부 (기본: true)
 * @param {number} options.interval - 폴링 간격(ms) (기본: 5000)
 * @param {number} options.maxDuration - 최대 모니터링 시간(ms) (기본: 10분)
 */
const useFileProcessingMonitor = (files, onStatusUpdate, options = {}) => {
  const {
    enabled = true,
    interval = 5000, // 5초
    maxDuration = 600000, // 10분
  } = options;

  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 처리 중인 파일 필터링
  const getProcessingFiles = useCallback(() => {
    if (!files || files.length === 0) return [];

    return files.filter(file =>
      file.processing_status === 'processing' ||
      file.processing_status === 'pending'
    );
  }, [files]);

  // 폴링 함수
  const pollProcessingStatus = useCallback(async () => {
    const processingFiles = getProcessingFiles();

    if (processingFiles.length === 0) {
      // 처리 중인 파일이 없으면 폴링 중지
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 최대 모니터링 시간 체크
    if (startTimeRef.current && Date.now() - startTimeRef.current > maxDuration) {
      console.log('[FileProcessingMonitor] Max duration reached, stopping monitoring');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    try {
      // 배치로 상태 조회
      const fileIds = processingFiles.map(f => f.id || f.file_id);

      // AbortController로 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      console.log(`[FileProcessingMonitor] Polling status for ${fileIds.length} files:`, fileIds);

      const response = await fileApi.getBatchProcessingStatus(fileIds);

      // 상태 업데이트 콜백 호출
      if (onStatusUpdate && response.results) {
        onStatusUpdate(response.results);
      }

      // 모든 파일이 완료/실패 상태면 폴링 중지
      const allDone = response.results.every(
        r => r.status === 'completed' || r.status === 'failed'
      );

      if (allDone) {
        console.log('[FileProcessingMonitor] All files processed, stopping monitoring');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // 요청이 취소된 경우 무시
        return;
      }

      console.warn('[FileProcessingMonitor] Failed to poll processing status:', error);

      // 404 또는 403 에러면 폴링 중지 (API가 아직 없거나 권한 없음)
      if (error.response?.status === 404 || error.response?.status === 403) {
        console.log('[FileProcessingMonitor] API not available, stopping monitoring');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  }, [files, onStatusUpdate, maxDuration, getProcessingFiles]);

  // 폴링 시작/중지
  useEffect(() => {
    if (!enabled) {
      // 비활성화된 경우 정리
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const processingFiles = getProcessingFiles();

    if (processingFiles.length > 0) {
      // 처리 중인 파일이 있으면 폴링 시작
      if (!intervalRef.current) {
        console.log(`[FileProcessingMonitor] Starting monitoring for ${processingFiles.length} files`);
        startTimeRef.current = Date.now();

        // 즉시 한 번 실행
        pollProcessingStatus();

        // 주기적으로 실행
        intervalRef.current = setInterval(pollProcessingStatus, interval);
      }
    } else {
      // 처리 중인 파일이 없으면 폴링 중지
      if (intervalRef.current) {
        console.log('[FileProcessingMonitor] No files to monitor, stopping');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        startTimeRef.current = null;
      }
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, interval, files, pollProcessingStatus, getProcessingFiles]);

  // 수동으로 폴링 트리거
  const trigger = useCallback(() => {
    pollProcessingStatus();
  }, [pollProcessingStatus]);

  return { trigger };
};

export default useFileProcessingMonitor;
