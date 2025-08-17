/** @type {import('next').NextConfig} */
const nextConfig = {
  // API 키를 클라이언트에 노출하지 않음 - 서버 사이드에서만 사용
  // env 설정 제거
  // Next.js에서 번들링 제외할 모듈 목록
  transpilePackages: ['mammoth'],
  // Node.js 런타임 사용 (API 라우트 설정은 각 라우트 파일에서 직접 설정)
  // webpack 설정을 통해 특정 모듈 처리 방식 커스터마이징
  webpack: (config) => {
    // pdf-parse 라이브러리 처리를 위한 설정
    config.externals = [...(config.externals || []), 'pdf-parse'];
    return config;
  },
}

module.exports = nextConfig 