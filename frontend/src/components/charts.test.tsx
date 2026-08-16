import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { BarChart, DonutChart, RankList, ChartCard } from './charts'

describe('chart components', () => {
  afterEach(() => {
    cleanup()
  })

  it('BarChart shows the title and month labels', () => {
    render(
      <BarChart
        title="Last 6 months"
        data={[
          { label: 'Mar', value: 100 },
          { label: 'Apr', value: 250 },
        ]}
      />,
    )
    expect(screen.getByText('Last 6 months')).toBeInTheDocument()
    expect(screen.getByText('Mar')).toBeInTheDocument()
    expect(screen.getByText('Apr')).toBeInTheDocument()
  })

  it('BarChart shows an empty state when all values are zero', () => {
    render(<BarChart title="Spend" data={[{ label: 'Mar', value: 0 }]} empty="No spend yet" />)
    expect(screen.getByText('No spend yet')).toBeInTheDocument()
  })

  it('DonutChart shows the total and legend labels', () => {
    render(
      <DonutChart
        title="Status"
        data={[
          { label: 'PENDING', value: 3 },
          { label: 'COMPLETED', value: 2 },
        ]}
      />,
    )
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('PENDING')).toBeInTheDocument()
    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    expect(screen.getByText('total')).toBeInTheDocument()
  })

  it('DonutChart shows an empty state when there is no data', () => {
    render(<DonutChart title="Status" data={[]} empty="Nothing yet" />)
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
  })

  it('DonutChart colors partial, shortage and low labels individually', () => {
    render(
      <DonutChart
        title="Status"
        data={[
          { label: 'PARTIAL', value: 2 },
          { label: 'COMPLETED', value: 3 },
          { label: 'LOW', value: 1 },
          { label: 'SHORTAGE', value: 1 },
        ]}
      />,
    )
    const dots = document.querySelectorAll('span[style*="background-color"]')
    const styles = [...dots].map((d) => (d as HTMLElement).style.backgroundColor)
    expect(styles).toContain('rgb(13, 148, 136)')
    expect(styles).toContain('rgb(14, 165, 233)')
    expect(styles).toContain('rgb(245, 158, 11)')
  })

  it('RankList shows labels and values', () => {
    render(
      <RankList
        title="Top vendors"
        data={[
          { label: 'Acme', value: 500 },
          { label: 'Beta', value: 300 },
        ]}
      />,
    )
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('300')).toBeInTheDocument()
  })

  it('RankList shows an empty state when there are no rows', () => {
    render(<RankList title="Top vendors" data={[]} empty="None" />)
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('ChartCard renders the card heading', () => {
    render(
      <ChartCard title="Monthly Spend">
        <p>inside</p>
      </ChartCard>,
    )
    expect(screen.getByRole('heading', { name: /monthly spend/i })).toBeInTheDocument()
    expect(screen.getByText('inside')).toBeInTheDocument()
  })
})
