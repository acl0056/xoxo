using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at https://go.microsoft.com/fwlink/?LinkId=234238

namespace Easycoustics.Transition.Pages
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class DesignPage : Page
    {
        public DesignPage()
        {
            this.InitializeComponent();
        }

        private void PageLoaded(object sender, RoutedEventArgs e)
        {
            PageGrid.Children.Add(CircuitEditor.CircuitEditor.currentInstance);
        }

        private void PageUnloaded(object sender, RoutedEventArgs e)
        {
            PageGrid.Children.Remove(CircuitEditor.CircuitEditor.currentInstance);
        }
    }
}
