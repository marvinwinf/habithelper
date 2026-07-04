import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Sheet } from '../Sheet';

describe('Sheet', () => {
  it('renders nothing when not visible', async () => {
    await render(
      <Sheet visible={false} onClose={jest.fn()} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );
    expect(screen.queryByTestId('sheet-content')).toBeNull();
    expect(screen.queryByText('Sheet content')).toBeNull();
  });

  it('renders its children when visible', async () => {
    await render(
      <Sheet visible onClose={jest.fn()} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );
    expect(screen.getByText('Sheet content')).toBeTruthy();
  });

  it('calls onClose when the backdrop is pressed', async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose} testID="sheet">
        <Text>Sheet content</Text>
      </Sheet>
    );

    await fireEvent.press(screen.getByTestId('sheet-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
